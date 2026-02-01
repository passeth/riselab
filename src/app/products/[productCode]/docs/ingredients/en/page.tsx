"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product, IngredientComponent } from "@/types/database";

// 원료코드 정규화
function normalizeIngredientCode(code: string): string {
  if (/^[A-Z]{3}-[0-9]{4}[A-Z]-/.test(code)) {
    return code.replace(/[A-Z]-[0-9]+[A-Z]*$/, '');
  }
  return code;
}

interface BomRawItem {
  materialcode: string;
  materialname: string | null;
  usemount: number | null;
}

interface NormalizedBomItem {
  baseCode: string;
  materialname: string;
  totalUsemount: number;
  components: IngredientComponent[];
}

interface EnglishIngredientRow {
  no: number;
  code: string;
  ingredientName: string;
  wtPercent: number;
  source: string;
  casNo: string;
  function: string;
}

// Fragrance Allergen CAS numbers (EU 26 allergens)
const FRAGRANCE_ALLERGEN_CAS = new Set([
  "5989-27-5",   // Limonene
  "80-56-8",     // Alpha-Pinene
  "127-91-3",    // Beta-Pinene
  "5989-54-8",   // Limonene (L-)
  "99-87-6",     // p-Cymene
  "470-82-6",    // Eucalyptol
  "78-70-6",     // Linalool
  "106-22-9",    // Citronellol
  "106-24-1",    // Geraniol
  "7540-51-4",   // Citronellal
  "5392-40-5",   // Citral
  "91-64-5",     // Coumarin
  "97-53-0",     // Eugenol
  "97-54-1",     // Isoeugenol
  "104-55-2",    // Cinnamaldehyde
  "103-41-3",    // Benzyl Cinnamate
  "118-58-1",    // Benzyl Salicylate
  "100-51-6",    // Benzyl Alcohol
  "120-51-4",    // Benzyl Benzoate
  "122-40-7",    // Amyl Cinnamal
  "101-86-0",    // Hexyl Cinnamal
  "105-13-5",    // Anisyl Alcohol
  "80-54-6",     // Butylphenyl Methylpropional
  "4602-84-0",   // Farnesol
  "31906-04-4",  // Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde
  "90-17-5",     // Methyl 2-Octynoate
  "111-12-6",    // Methyl Octine Carbonate
  "107-75-5",    // Hydroxycitronellal
  "6259-76-3",   // Hexyl Salicylate
  "1222-05-5",   // Galaxolide
  "21145-77-7",  // Tonalide
  "141-10-6",    // Pseudoionone
]);

export default function EnglishIngredientsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<Product | null>(null);
  const [bomItems, setBomItems] = useState<NormalizedBomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: productData, error: productErr } = await supabase
        .from("labdoc_products")
        .select("*")
        .eq("product_code", decodedProductCode)
        .single();

      if (productErr) {
        if (productErr.code === "PGRST116") {
          setError("Product not found");
        } else {
          throw productErr;
        }
        setLoading(false);
        return;
      }

      setProduct(productData);

      let items: NormalizedBomItem[] = [];
      
      if (productData.semi_product_code) {
        const { data: bomData, error: bomErr } = await supabase
          .from("bom_master")
          .select("materialcode, materialname, usemount")
          .eq("prdcode", productData.semi_product_code)
          .order("usemount", { ascending: false });

        if (bomErr) {
          console.error("BOM fetch error:", bomErr);
        } else if (bomData && bomData.length > 0) {
          const normalizedMap = new Map<string, {
            materialname: string;
            totalUsemount: number;
          }>();

          (bomData as BomRawItem[]).forEach((item) => {
            if (!item.materialcode) return;
            const baseCode = normalizeIngredientCode(item.materialcode);
            const existing = normalizedMap.get(baseCode);
            
            if (existing) {
              existing.totalUsemount += item.usemount ?? 0;
            } else {
              normalizedMap.set(baseCode, {
                materialname: item.materialname ?? baseCode,
                totalUsemount: item.usemount ?? 0,
              });
            }
          });

          const baseCodes = Array.from(normalizedMap.keys());
          
          const { data: componentsData, error: compErr } = await supabase
            .from("labdoc_ingredient_components")
            .select("*")
            .in("ingredient_code", baseCodes)
            .order("component_order", { ascending: true });

          if (compErr) {
            console.error("Components fetch error:", compErr);
          }

          const componentsMap = new Map<string, IngredientComponent[]>();
          (componentsData ?? []).forEach((comp) => {
            const existing = componentsMap.get(comp.ingredient_code) ?? [];
            existing.push(comp);
            componentsMap.set(comp.ingredient_code, existing);
          });

          items = Array.from(normalizedMap.entries())
            .map(([baseCode, data]) => ({
              baseCode,
              materialname: data.materialname,
              totalUsemount: data.totalUsemount,
              components: componentsMap.get(baseCode) ?? [],
            }))
            .sort((a, b) => b.totalUsemount - a.totalUsemount);
        }
      }

      setBomItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 영문 성분표: 원료 단위로 표시
  const englishIngredients = useMemo((): EnglishIngredientRow[] => {
    if (bomItems.length === 0) return [];

    const rows: EnglishIngredientRow[] = [];
    
    bomItems.forEach((item) => {
      // 원료의 첫 번째 성분 기준 (또는 모든 INCI 조합)
      const firstComp = item.components[0];
      const inciNames = item.components
        .map((c) => c.inci_name_en)
        .filter(Boolean)
        .join(", ");
      const functions = [...new Set(item.components.map((c) => c.function).filter(Boolean))].join(", ");
      const casNumbers = [...new Set(item.components.map((c) => c.cas_number).filter(Boolean))].join(", ");
      
      rows.push({
        no: 0,
        code: item.baseCode,
        ingredientName: inciNames || item.materialname,
        wtPercent: item.totalUsemount / 1000,
        source: "ICID",
        casNo: casNumbers || firstComp?.cas_number || "—",
        function: functions || firstComp?.function || "—",
      });
    });

    return rows
      .sort((a, b) => b.wtPercent - a.wtPercent)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  // Fragrance Allergens 필터링
  const fragranceAllergens = useMemo(() => {
    const allergens: { name: string; casNo: string; wtPercent: number }[] = [];
    
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      
      item.components.forEach((comp) => {
        if (comp.cas_number && FRAGRANCE_ALLERGEN_CAS.has(comp.cas_number)) {
          const ratio = comp.composition_ratio ?? 100;
          const calculatedPercent = (rawWtPercent * ratio) / 100;
          
          // 0.001% 이상만 표시
          if (calculatedPercent >= 0.001) {
            allergens.push({
              name: comp.inci_name_en || "Unknown",
              casNo: comp.cas_number,
              wtPercent: calculatedPercent,
            });
          }
        }
      });
    });

    // 합산 (같은 CAS No 기준)
    const merged = new Map<string, { name: string; casNo: string; wtPercent: number }>();
    allergens.forEach((a) => {
      const existing = merged.get(a.casNo);
      if (existing) {
        existing.wtPercent += a.wtPercent;
      } else {
        merged.set(a.casNo, { ...a });
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent);
  }, [bomItems]);

  const totalPercent = englishIngredients.reduce((sum, r) => sum + r.wtPercent, 0);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-500 text-sm">{error || "Product not found"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Print Button */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* English Ingredients Statement */}
      <div className="bg-white border-2 border-slate-800 print:border-black">
        {/* Header */}
        <div className="text-center py-4 border-b-2 border-slate-800">
          <h1 className="text-lg font-bold tracking-wider text-slate-800">FORMULA INGREDIENTS STATEMENT</h1>
        </div>

        {/* Product Info */}
        <div className="border-b border-slate-300 p-4 space-y-2 text-sm">
          <div className="flex">
            <span className="w-32 font-semibold text-slate-600">PRODUCT NAME :</span>
            <span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span>
          </div>
          <div className="flex gap-8">
            <div className="flex">
              <span className="font-semibold text-slate-600">REFERENCES :</span>
              <span className="ml-2 font-mono text-slate-800">{product.product_code}</span>
            </div>
            <span className="text-slate-600">{product.packaging_unit || "—"}</span>
            <span className="text-slate-600">{product.created_date || "—"}</span>
          </div>
        </div>

        {/* Ingredients Table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">NO.</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-24">CODE</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">Ingredient Name</th>
              <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-20">%(W/W)</th>
              <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-16">Source</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-28">CAS No</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 w-32">Function</th>
            </tr>
          </thead>
          <tbody>
            {englishIngredients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  No ingredient data available
                </td>
              </tr>
            ) : (
              englishIngredients.map((row) => (
                <tr key={row.code} className="border-b border-slate-200 hover:bg-amber-50/30">
                  <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-200">{row.no}</td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{row.code}</td>
                  <td className="px-2 py-2 text-slate-800 border-r border-slate-200">{row.ingredientName}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 border-r border-slate-200">
                    {row.wtPercent >= 99.99 ? "To. 100" : row.wtPercent.toFixed(5)}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-200">{row.source}</td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{row.casNo}</td>
                  <td className="px-2 py-2 text-slate-600 text-xs">{row.function}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-400">
              <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td>
              <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                {totalPercent.toFixed(5)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>

        {/* Fragrance Allergens Section */}
        {fragranceAllergens.length > 0 && (
          <div className="border-t-2 border-slate-600">
            <div className="bg-slate-200 px-4 py-2">
              <h2 className="text-sm font-bold text-slate-700">Fragrance Allergens Ingredients</h2>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300">
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">NO.</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">INCI Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-32">CAS No</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">%(W/W)</th>
                </tr>
              </thead>
              <tbody>
                {fragranceAllergens.map((a, idx) => (
                  <tr key={a.casNo} className="border-b border-slate-200 hover:bg-amber-50/30">
                    <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-800 border-r border-slate-200">{a.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{a.casNo}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{a.wtPercent.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-6xl, .max-w-6xl * { visibility: visible; }
          .max-w-6xl {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            max-width: 100%;
            padding: 10mm;
          }
          table { font-size: 9pt; }
        }
      `}</style>
    </div>
  );
}

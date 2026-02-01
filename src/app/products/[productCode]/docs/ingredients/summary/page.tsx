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

interface SummaryRow {
  no: number;
  inciName: string;
  wtPercent: number;
  function: string;
  casNo: string;
}

export default function SummaryPage() {
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

  // 최종 합산: INCI별로 합산, 함량순 정렬
  const summaryRows = useMemo((): SummaryRow[] => {
    if (bomItems.length === 0) return [];

    // INCI Name 기준으로 합산
    const inciMap = new Map<string, {
      wtPercent: number;
      functions: Set<string>;
      casNumbers: Set<string>;
    }>();
    
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      
      if (item.components.length === 0) {
        // 성분 정보 없는 원료는 원료명 그대로 사용
        const key = item.materialname.toUpperCase();
        const existing = inciMap.get(key);
        if (existing) {
          existing.wtPercent += rawWtPercent;
        } else {
          inciMap.set(key, {
            wtPercent: rawWtPercent,
            functions: new Set(),
            casNumbers: new Set(),
          });
        }
      } else {
        item.components.forEach((comp) => {
          const inciName = (comp.inci_name_en || comp.inci_name_kr || "Unknown").toUpperCase();
          const ratio = comp.composition_ratio ?? 100;
          const calculated = (rawWtPercent * ratio) / 100;
          
          const existing = inciMap.get(inciName);
          if (existing) {
            existing.wtPercent += calculated;
            if (comp.function) existing.functions.add(comp.function);
            if (comp.cas_number) existing.casNumbers.add(comp.cas_number);
          } else {
            inciMap.set(inciName, {
              wtPercent: calculated,
              functions: new Set(comp.function ? [comp.function] : []),
              casNumbers: new Set(comp.cas_number ? [comp.cas_number] : []),
            });
          }
        });
      }
    });

    // 배열로 변환, 함량순 정렬, 번호 부여
    return Array.from(inciMap.entries())
      .map(([inciName, data]) => ({
        no: 0,
        inciName,
        wtPercent: data.wtPercent,
        function: Array.from(data.functions).join(", ") || "—",
        casNo: Array.from(data.casNumbers).join(", ") || "—",
      }))
      .sort((a, b) => b.wtPercent - a.wtPercent)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  const totalPercent = summaryRows.reduce((sum, r) => sum + r.wtPercent, 0);

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
    <div className="max-w-5xl mx-auto">
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

      {/* Summary Statement */}
      <div className="bg-white border-2 border-slate-800 print:border-black">
        {/* Header */}
        <div className="text-center py-4 border-b-2 border-slate-800">
          <h1 className="text-lg font-bold tracking-wider text-slate-800">INCI INGREDIENT SUMMARY</h1>
          <p className="text-xs text-slate-500 mt-1">Consolidated by INCI Name, Sorted by Weight %</p>
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
          </div>
        </div>

        {/* Summary Table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">No.</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">INCI Name</th>
              <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-24">WT %</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-40">Function</th>
              <th className="px-2 py-2 text-left font-semibold text-slate-600 w-32">CAS No.</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  No ingredient data available
                </td>
              </tr>
            ) : (
              summaryRows.map((row) => (
                <tr key={row.inciName} className="border-b border-slate-200 hover:bg-amber-50/30">
                  <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-200">{row.no}</td>
                  <td className="px-2 py-2 text-slate-800 border-r border-slate-200">{row.inciName}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 border-r border-slate-200">
                    {row.wtPercent.toFixed(6)}
                  </td>
                  <td className="px-2 py-2 text-slate-600 text-xs border-r border-slate-200">{row.function}</td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.casNo}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-400">
              <td colSpan={2} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td>
              <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                {totalPercent.toFixed(6)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>

        {/* Stats */}
        <div className="border-t border-slate-300 p-4 bg-slate-50 text-sm">
          <div className="flex gap-8 text-slate-600">
            <span>Total INCI Components: <strong className="text-slate-800">{summaryRows.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-5xl, .max-w-5xl * { visibility: visible; }
          .max-w-5xl {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            max-width: 100%;
            padding: 10mm;
          }
          table { font-size: 8pt; }
        }
      `}</style>
    </div>
  );
}

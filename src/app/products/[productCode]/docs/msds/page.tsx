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

interface IngredientRow {
  inci_name: string;
  cas_number: string | null;
  function: string | null;
}

interface PhysicalProperty {
  label: string;
  value: string;
}

export default function MsdsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [physicalProps, setPhysicalProps] = useState<PhysicalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 제품 정보 조회
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

      // 2. 물리적 특성 조회 (qc_specs에서 영문)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: specsData } = await (supabase as any)
        .from("labdoc_product_qc_specs")
        .select("test_item_en, specification_en")
        .eq("product_code", decodedProductCode)
        .eq("qc_type", "완제품")
        .not("test_item_en", "is", null);

      if (specsData) {
        const props: PhysicalProperty[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        specsData.forEach((s: any) => {
          if (s.test_item_en === 'Appearance') {
            props.push({ label: 'Appearance', value: s.specification_en || 'N/A' });
          }
          if (s.test_item_en === 'Odor') {
            props.push({ label: 'Fragrance', value: s.specification_en || 'Same as Standard' });
          }
          if (s.test_item_en === 'pH ( 25℃ )') {
            props.push({ label: 'pH(25℃)', value: s.specification_en || 'none' });
          }
        });
        // 기본값 추가
        props.push({ label: 'Melting/Freezing Point', value: 'Not available' });
        props.push({ label: 'Boiling Point', value: 'Not available' });
        setPhysicalProps(props);
      }

      // 3. 성분 조회 (BOM + ingredient_components)
      if (productData.semi_product_code) {
        const { data: bomData } = await supabase
          .from("bom_master")
          .select("materialcode, materialname, usemount")
          .eq("prdcode", productData.semi_product_code)
          .order("usemount", { ascending: false });

        if (bomData && bomData.length > 0) {
          // 원료코드 정규화
          const baseCodes = [...new Set((bomData as BomRawItem[]).map(b => normalizeIngredientCode(b.materialcode)))];

          // 성분 조회
          const { data: componentsData } = await supabase
            .from("labdoc_ingredient_components")
            .select("inci_name_en, cas_number, function")
            .in("ingredient_code", baseCodes);

          if (componentsData) {
            // 중복 제거 (INCI 기준)
            const uniqueMap = new Map<string, IngredientRow>();
            componentsData.forEach((c) => {
              const inci = c.inci_name_en || '';
              if (inci && !uniqueMap.has(inci)) {
                uniqueMap.set(inci, {
                  inci_name: inci,
                  cas_number: c.cas_number,
                  function: c.function,
                });
              }
            });
            setIngredients(Array.from(uniqueMap.values()));
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => window.print();

  const today = useMemo(() => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

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
    <div className="max-w-4xl mx-auto">
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

      {/* MSDS Document */}
      <div className="bg-white border border-slate-300 print:border-black text-sm">
        {/* Header */}
        <div className="border-b border-slate-300 p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500 italic">EVAS</div>
              <h1 className="text-2xl font-bold text-slate-800">EVAS Cosmetics Co., Ltd.</h1>
              <p className="text-xs text-slate-500 mt-1">
                35-5, Sandan-Ro, Pyeongtaek-Si, Gyeonggi-Do, Korea<br />
                Tel : +82-31-611-7252 &nbsp; Fax : +82-31-611-5764
              </p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-slate-800 mt-4">Material Safety Data Sheet</h2>
          <p className="text-right text-xs text-slate-500 mt-2">DATE : {today}</p>
        </div>

        {/* 1. IDENTITY OF PRODUCT AND COMPANY */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">1. IDENTITY OF PRODUCT AND COMPANY</div>
          <div className="px-4 py-3 space-y-2">
            <p>
              <span className="font-medium">Finished Product Name : </span>
              <span className="text-cyan-600">{product.english_name || product.korean_name || "—"}</span>
            </p>
            <div className="mt-3">
              <p className="font-medium">Company Information:</p>
              <ul className="ml-4 mt-1 space-y-0.5 text-slate-600">
                <li>● Company Name : EVAS Cosmetics Co., Ltd.</li>
                <li>● Adress : 35-5, Sandan-Ro, Pyeongtaek-Si, Gyeonggi-Do, Korea</li>
                <li>● Telephone : +82-31-611-7252</li>
                <li>● Fax : +82-31-611-5764</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2. PRODUCT APPLICATION */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">2. PRODUCT APPLICATION</div>
          <div className="px-4 py-3">
            <p className="text-cyan-600">{product.cosmetic_type || "Skin care cosmetics"}</p>
          </div>
        </div>

        {/* 3. COMPOSITION AND INGREDIENTS */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">3. COMPOSITION AND INGREDIENTS</div>
          <div className="px-4 py-3">
            {ingredients.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No ingredient data available</p>
            ) : (
              <table className="w-full text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">INGREDIENT NAME</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">CAS No</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-24">REFERENCE</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">FUNCTION</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30">
                      <td className="border border-slate-200 px-2 py-1">{ing.inci_name}</td>
                      <td className="border border-slate-200 px-2 py-1 font-mono text-xs">{ing.cas_number || "-"}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center">ICID</td>
                      <td className="border border-slate-200 px-2 py-1 text-xs">{ing.function || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. PHYSICAL AND CHEMICAL PROPERTIES */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">4. PHYSICAL AND CHEMICAL PROPERTIES</div>
          <div className="px-4 py-3 space-y-1">
            {physicalProps.map((prop, idx) => (
              <p key={idx}>
                <span className="font-medium">{prop.label} : </span>
                <span className={prop.label === 'Appearance' || prop.label === 'pH(25℃)' ? 'text-amber-600' : 'text-cyan-600'}>
                  {prop.value}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* 5. HAZARD IDENTIFICATION */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">5. HAZARD IDENTIFICATION</div>
          <div className="px-4 py-3 space-y-3 text-xs">
            <div>
              <p className="font-bold">EMERGENCY OVERVIEW :</p>
              <p className="text-slate-600 mt-1">
                This is a personal care or cosmetic product that is safe for consumers and other users under intended and reasonably foreseeable use. Additional information on toxicological endpoints is available from the supplier upon request.
              </p>
            </div>
            <div>
              <p className="font-bold">POTENTIAL HEALTH EFFECTS :</p>
              <ul className="mt-1 space-y-0.5 text-slate-600">
                <li>● <span className="font-medium">EYE</span> : Exposure may cause mild eye irritation.</li>
                <li>● <span className="font-medium">Skin</span> : May cause irritation or sensitization in sensitive individuals.</li>
                <li>● <span className="font-medium">Inhalation</span> : May cause mild, transient respiratory irritation.</li>
                <li>● <span className="font-medium">Ingestion</span> : Product used as intended is not expected to cause gastrointestinal irritation.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 6. FIRST AID MEASURES */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">6. FIRST AID MEASURES</div>
          <div className="px-4 py-3 space-y-2 text-xs text-slate-600">
            <p>
              <span className="font-bold text-slate-700">Eye</span> : Following accidental eye exposure, thorough rinsing of the affected area for 15-20 minutes with clean cold water is recommended. If discomfort or irritation persists, contact a physician.
            </p>
            <p>
              <span className="font-bold text-slate-700">Skin Problem</span> : Thoroughly rinse with water. Discontinue use of product. If discomfort persists and/or the skin reaction worsens, contact a physician immediately.
            </p>
            <p>
              <span className="font-bold text-slate-700">Inhalation</span> : If respiratory irritation occurs, remove individual to fresh air.
            </p>
            <p>
              <span className="font-bold text-slate-700">Ingestion</span> : Accidental ingestion of product may necessitate medical attention. In case of accidental ingestion dilute with fluids (Water or milk) and treat symptomatically. Do not induce vomiting.
            </p>
          </div>
        </div>

        {/* 7. FIRE – FIGHTING MEASURES */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">7. FIRE – FIGHTING MEASURES</div>
          <div className="px-4 py-3 space-y-2 text-xs text-slate-600">
            <p><span className="font-bold text-slate-700">Flash Point</span> : Not applicable.</p>
            <p><span className="font-bold text-slate-700">Extinguishing Media</span> : Use chemical foam, dry chemical, carbon dioxide or water.</p>
            <p><span className="font-bold text-slate-700">Explosion Hazard</span> : No applicable information has been found</p>
            <p><span className="font-bold text-slate-700">Fire Fighting Instructions</span> : Contact emergency personnel. Use self-contained breathing apparatus and full protective gear, if large quantities of product are involved.</p>
          </div>
        </div>

        {/* 8. ACCIDENTAL RELEASE MEASURES */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">8. ACCIDENTAL RELEASE MEASURES</div>
          <div className="px-4 py-3 space-y-1 text-xs text-slate-600">
            <p><span className="font-bold text-slate-700">Personal protection</span> : Not required</p>
            <p><span className="font-bold text-slate-700">Environmental protection</span> : No special measures required</p>
          </div>
        </div>

        {/* 9-16 (Condensed) */}
        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">9. HANDLING AND STORAGE</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>Store in a cool, dry place away from direct sunlight. Keep container tightly closed when not in use.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">10. EXPOSURE CONTROLS / PERSONAL PROTECTION</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>No special protective equipment required for normal consumer use.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">11. STABILITY AND REACTIVITY</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p><span className="font-bold">Stability</span> : Stable under normal conditions. <span className="font-bold">Hazardous Polymerization</span> : Will not occur.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">12. TOXICOLOGICAL INFORMATION</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>This product is not expected to produce any significant adverse health effects when used as intended.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">13. ECOLOGICAL INFORMATION</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>No specific environmental data available. Dispose of in accordance with local regulations.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">14. DISPOSAL CONSIDERATIONS</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>Dispose of contents/container in accordance with local/regional/national/international regulations.</p>
          </div>
        </div>

        <div className="border-b border-slate-300">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">15. TRANSPORT INFORMATION</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>Not classified as dangerous goods for transport.</p>
          </div>
        </div>

        <div>
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700">16. REGULATORY INFORMATION</div>
          <div className="px-4 py-2 text-xs text-slate-600">
            <p>This product complies with all applicable cosmetic regulations in the country of sale.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-4xl, .max-w-4xl * { visibility: visible; }
          .max-w-4xl {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            max-width: 100%;
            padding: 10mm;
          }
          .bg-slate-100 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

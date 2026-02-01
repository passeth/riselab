"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, AlertCircle, Edit2, FileSpreadsheet, List, FlaskConical, Beaker, FileText } from "lucide-react";
import type { Product, IngredientComponent } from "@/types/database";

// 원료코드 정규화: MXD-0002A-1 → MXD-0002
function normalizeIngredientCode(code: string): string {
  // 패턴: XXX-NNNN + 알파벳 + 하이픈 (확장 코드)
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
  originalCodes: string[];
  materialname: string;
  totalUsemount: number;
  components: IngredientComponent[];
}

interface BreakdownItem {
  no: number;
  inciName: string;
  wtPercent: number;
  function: string;
  casNumber: string;
}

// Formula Detail (원료별 상세 브레이크다운) - Breakdown B
interface FormulaDetailRow {
  no: number | null;           // 원료 번호 (하위 성분은 null)
  inciName: string;            // INCI Name
  wtPercent: number | null;    // 원료 사용량 % (하위 성분은 null)
  ratioInRaw: number;          // % in raw material
  calculatedPercent: number;   // % calculated
  function: string;            // Function
  casNumber: string;           // CAS No.
  isSubRow: boolean;           // 하위 성분 여부 (스타일링용)
}

interface ProductInfo extends Product {
  bomItems: NormalizedBomItem[];
}

type TabType = "material" | "breakdown" | "formula";

export default function ProductDetailPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("material");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. labdoc_products에서 제품 정보 조회
      const { data: productData, error: productErr } = await supabase
        .from("labdoc_products")
        .select("*")
        .eq("product_code", decodedProductCode)
        .single();

      if (productErr) {
        if (productErr.code === "PGRST116") {
          setError("품목을 찾을 수 없습니다");
        } else {
          throw productErr;
        }
        setLoading(false);
        return;
      }

      // 2. 반제품코드(B코드)로 BOM 원료 목록 조회
      let bomItems: NormalizedBomItem[] = [];
      
      if (productData.semi_product_code) {
        const { data: bomData, error: bomErr } = await supabase
          .from("bom_master")
          .select("materialcode, materialname, usemount")
          .eq("prdcode", productData.semi_product_code)
          .order("usemount", { ascending: false });

        if (bomErr) {
          console.error("BOM fetch error:", bomErr);
        } else if (bomData && bomData.length > 0) {
          // 3. 원료코드 정규화 및 그룹화
          const normalizedMap = new Map<string, {
            originalCodes: string[];
            materialname: string;
            totalUsemount: number;
          }>();

          (bomData as BomRawItem[]).forEach((item) => {
            if (!item.materialcode) return;
            const baseCode = normalizeIngredientCode(item.materialcode);
            const existing = normalizedMap.get(baseCode);
            
            if (existing) {
              existing.originalCodes.push(item.materialcode);
              existing.totalUsemount += item.usemount ?? 0;
            } else {
              normalizedMap.set(baseCode, {
                originalCodes: [item.materialcode],
                materialname: item.materialname ?? baseCode,
                totalUsemount: item.usemount ?? 0,
              });
            }
          });

          // 4. 정규화된 코드로 labdoc_ingredient_components 조회
          const baseCodes = Array.from(normalizedMap.keys());
          
          const { data: componentsData, error: compErr } = await supabase
            .from("labdoc_ingredient_components")
            .select("*")
            .in("ingredient_code", baseCodes)
            .order("component_order", { ascending: true });

          if (compErr) {
            console.error("Components fetch error:", compErr);
          }

          // 5. 컴포넌트 맵 생성
          const componentsMap = new Map<string, IngredientComponent[]>();
          (componentsData ?? []).forEach((comp) => {
            const existing = componentsMap.get(comp.ingredient_code) ?? [];
            existing.push(comp);
            componentsMap.set(comp.ingredient_code, existing);
          });

          // 6. 최종 bomItems 생성 (사용량 내림차순)
          bomItems = Array.from(normalizedMap.entries())
            .map(([baseCode, data]) => ({
              baseCode,
              originalCodes: data.originalCodes,
              materialname: data.materialname,
              totalUsemount: data.totalUsemount,
              components: componentsMap.get(baseCode) ?? [],
            }))
            .sort((a, b) => b.totalUsemount - a.totalUsemount);
        }
      }

      setProduct({
        ...productData,
        bomItems,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 원료 단위 성분표 생성
  const materialTable = useMemo(() => {
    if (!product) return [];
    
    return product.bomItems.map((item, idx) => {
      const inciNames = item.components.map((c) => c.inci_name_en).filter(Boolean).join(", ");
      const casNumbers = item.components.map((c) => c.cas_number).filter(Boolean).join(", ");
      const functions = item.components.map((c) => c.function).filter(Boolean);
      const uniqueFunctions = [...new Set(functions)].join(", ");
      
      return {
        no: idx + 1,
        baseCode: item.baseCode,
        originalCodes: item.originalCodes,
        materialname: item.materialname,
        inciNames: inciNames || "-",
        usemount: item.totalUsemount,
        casNumbers: casNumbers || "-",
        functions: uniqueFunctions || "-",
        componentCount: item.components.length,
      };
    });
  }, [product]);

  // 브레이크다운 성분표 생성 (INCI 단위 합산)
  const breakdownTable = useMemo((): BreakdownItem[] => {
    if (!product) return [];

    // INCI별로 함량 합산
    const inciMap = new Map<string, {
      totalAmount: number;
      function: string;
      casNumber: string;
      maxAmount: number; // 가장 많은 기여를 한 원료의 함량 (대표 function/cas 선정용)
    }>();

    product.bomItems.forEach((item) => {
      item.components.forEach((comp) => {
        const inciName = (comp.inci_name_en ?? "").trim().toUpperCase();
        if (!inciName) return;

        // 해당 INCI의 최종 함량 = 원료 사용량 × 성분 비율 / 100
        const amount = (item.totalUsemount * (comp.composition_ratio ?? 0)) / 100;
        
        const existing = inciMap.get(inciName);
        if (existing) {
          existing.totalAmount += amount;
          // 가장 많이 기여하는 원료의 function/cas 사용
          if (amount > existing.maxAmount) {
            existing.maxAmount = amount;
            existing.function = comp.function ?? "";
            existing.casNumber = comp.cas_number ?? "";
          }
        } else {
          inciMap.set(inciName, {
            totalAmount: amount,
            function: comp.function ?? "",
            casNumber: comp.cas_number ?? "",
            maxAmount: amount,
          });
        }
      });
    });

    // 배열로 변환 및 정렬
    return Array.from(inciMap.entries())
      .map(([inciName, data], idx) => ({
        no: idx + 1,
        inciName,
        wtPercent: data.totalAmount / 1000, // BOM usemount가 1000 기준이면 /1000
        function: data.function || "-",
        casNumber: data.casNumber || "-",
      }))
      .sort((a, b) => b.wtPercent - a.wtPercent)
      .map((item, idx) => ({ ...item, no: idx + 1 })); // 정렬 후 번호 재할당
  }, [product]);

  // Formula Detail 테이블 생성 (원료별 상세 - Breakdown B)
  // 엑셀 포맷: No. | INCI Name | WT % | % in raw material | % calculated | Function | CAS No.
  const formulaDetailTable = useMemo((): FormulaDetailRow[] => {
    if (!product) return [];

    const rows: FormulaDetailRow[] = [];
    let materialNo = 0;

    product.bomItems.forEach((item) => {
      if (item.components.length === 0) {
        // 성분이 없는 원료는 원료명만 표시
        materialNo++;
        rows.push({
          no: materialNo,
          inciName: item.materialname,
          wtPercent: item.totalUsemount / 1000,
          ratioInRaw: 100,
          calculatedPercent: item.totalUsemount / 1000,
          function: "-",
          casNumber: "-",
          isSubRow: false,
        });
        return;
      }

      materialNo++;
      const wtPercent = item.totalUsemount / 1000;

      // 첫 번째 성분은 No.와 WT%를 표시
      item.components.forEach((comp, compIdx) => {
        const ratioInRaw = comp.composition_ratio ?? 0;
        const calculatedPercent = (item.totalUsemount * ratioInRaw) / 100 / 1000;

        rows.push({
          no: compIdx === 0 ? materialNo : null,
          inciName: comp.inci_name_en || "-",
          wtPercent: compIdx === 0 ? wtPercent : null,
          ratioInRaw,
          calculatedPercent,
          function: comp.function || "-",
          casNumber: comp.cas_number || "-",
          isSubRow: compIdx > 0,
        });
      });
    });

    return rows;
  }, [product]);

  const totalComponents = product?.bomItems.reduce((sum, item) => sum + item.components.length, 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-500 text-sm font-medium">{error || "품목을 찾을 수 없습니다"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-2 transition-colors"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{product.korean_name || product.english_name}</h1>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <p className="text-sm text-slate-400">
            품목코드: <span className="font-mono text-slate-600">{decodedProductCode}</span>
          </p>
          {product.semi_product_code && (
            <p className="text-sm text-slate-400">
              반제품: <span className="font-mono text-emerald-600">{product.semi_product_code}</span>
            </p>
          )}
          {product.cosmetic_type && (
            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
              {product.cosmetic_type}
            </span>
          )}
        </div>
      </div>

      {/* 제품 정보 요약 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-slate-400 text-xs uppercase">P제품코드</span>
            <p className="font-mono text-slate-600">{product.p_product_code || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase">반제품코드</span>
            <p className="font-mono text-emerald-600">{product.semi_product_code || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase">화장품유형</span>
            <p className="text-slate-600">{product.cosmetic_type || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase">원료 수</span>
            <p className="text-slate-600 font-semibold">{materialTable.length}개</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase">INCI 성분 수</span>
            <p className="text-slate-600 font-semibold">{breakdownTable.length}개</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href={`/products/${decodedProductCode}/docs`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
            <FileText size={16} /> 문서 보기
          </Link>
        </div>
      </div>

      {/* 성분표 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {/* 탭 헤더 */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("material")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "material"
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <List size={14} />
              원료 단위
            </button>
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "breakdown"
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <FlaskConical size={14} />
              브레이크다운
            </button>
            <button
              onClick={() => setActiveTab("formula")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "formula"
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Beaker size={14} />
              원료별 상세
            </button>
          </div>
          {product.semi_product_code && (
            <Link
              href={`/ingredients/${encodeURIComponent(product.semi_product_code)}`}
              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
            >
              <Edit2 size={12} /> 반제품 상세
            </Link>
          )}
        </div>
        
        {materialTable.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              {product.semi_product_code 
                ? "반제품 BOM에 등록된 원료가 없습니다" 
                : "반제품코드가 매핑되지 않았습니다"}
            </p>
            {!product.semi_product_code && (
              <p className="text-slate-300 text-xs mt-1">관리자에게 반제품코드 매핑을 요청하세요</p>
            )}
          </div>
        ) : activeTab === "material" ? (
          /* 원료 단위 성분표 */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                    NO.
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                    원료코드
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ingredient Name
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                    %(W/W)
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                    CAS No
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                    Function
                  </th>
                </tr>
              </thead>
              <tbody>
                {materialTable.map((row) => (
                  <tr
                    key={row.baseCode}
                    className="border-t border-slate-50 hover:bg-amber-50/40 transition-colors duration-200"
                  >
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{row.no}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/ingredients/${encodeURIComponent(row.baseCode)}`}
                        className="font-mono text-xs text-slate-600 hover:text-amber-600 transition-colors"
                      >
                        {row.baseCode}
                      </Link>

                    </td>
                    <td className="px-3 py-2.5 text-slate-700 text-xs leading-relaxed max-w-md">
                      {row.inciNames}
                      {row.componentCount === 0 && (
                        <span className="ml-2 text-amber-500 text-xs">(성분 미등록)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 text-xs">
                      {row.usemount !== null 
                        ? row.usemount >= 99999 
                          ? "To. 100" 
                          : (row.usemount / 1000).toFixed(4)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[200px] truncate" title={row.casNumbers}>
                      {row.casNumbers}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[200px] truncate" title={row.functions}>
                      {row.functions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "breakdown" ? (
          /* 브레이크다운 성분표 */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                    NO.
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    INCI Name
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                    WT %
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                    Function
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                    CAS No.
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdownTable.map((row) => (
                  <tr
                    key={row.inciName}
                    className="border-t border-slate-50 hover:bg-amber-50/40 transition-colors duration-200"
                  >
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{row.no}</td>
                    <td className="px-3 py-2.5 text-slate-700 text-xs font-medium">
                      {row.inciName}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600 text-xs">
                      {row.wtPercent >= 99.99 
                        ? "To. 100" 
                        : row.wtPercent.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[200px] truncate" title={row.function}>
                      {row.function}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[200px] truncate" title={row.casNumber}>
                      {row.casNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 원료별 상세 (Formula Detail - Breakdown B) */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                    No.
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    INCI Name
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
                    WT %
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                    % in raw
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                    % calc
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">
                    Function
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">
                    CAS No.
                  </th>
                </tr>
              </thead>
              <tbody>
                {formulaDetailTable.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-t transition-colors duration-200 ${
                      row.isSubRow 
                        ? "border-slate-50/50 bg-slate-25 hover:bg-slate-50" 
                        : "border-slate-100 hover:bg-amber-50/40"
                    }`}
                  >
                    <td className={`px-3 py-2 text-xs ${row.isSubRow ? "text-slate-300" : "text-slate-400 font-medium"}`}>
                      {row.no ?? ""}
                    </td>
                    <td className={`px-3 py-2 text-xs ${row.isSubRow ? "pl-6 text-slate-500" : "text-slate-700 font-medium"}`}>
                      {row.inciName}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${row.isSubRow ? "text-slate-300" : "text-slate-600"}`}>
                      {row.wtPercent !== null 
                        ? row.wtPercent >= 99.99 
                          ? "To. 100" 
                          : row.wtPercent.toFixed(2)
                        : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500 text-xs">
                      {row.ratioInRaw.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600 text-xs">
                      {row.calculatedPercent >= 99.99 
                        ? "To. 100" 
                        : row.calculatedPercent.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs truncate" title={row.function}>
                      {row.function}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs truncate" title={row.casNumber}>
                      {row.casNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

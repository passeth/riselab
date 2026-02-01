"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product } from "@/types/database";

interface TestSpec {
  id: string;
  order: number;
  test_item: string;
  specification: string;
  test_method: string;
}

export default function FinalProductSpecsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<Product | null>(null);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
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
          setError("품목을 찾을 수 없습니다");
        } else {
          throw productErr;
        }
        setLoading(false);
        return;
      }

      setProduct(productData);

      // labdoc_product_qc_specs 테이블에서 완제품 시험기준 데이터 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: specsData, error: specsErr } = await (supabase as any)
        .from("labdoc_product_qc_specs")
        .select("*")
        .eq("product_code", decodedProductCode)
        .eq("qc_type", "완제품")
        .order("sequence_no", { ascending: true });

      if (specsErr) {
        console.error("Final product specs fetch error:", specsErr);
        setTestSpecs([]);
      } else if (specsData && specsData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredSpecs = specsData
          // 순번이 0이거나 빈값인 경우 제외
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => s.sequence_no && s.sequence_no > 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => ({
            id: s.id,
            order: s.sequence_no,
            test_item: s.test_item || '',
            specification: s.specification || '',
            test_method: s.test_method || '',
          }));
        setTestSpecs(filteredSpecs);
      } else {
        setTestSpecs([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <p className="text-red-500 text-sm">{error || "품목을 찾을 수 없습니다"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 인쇄 버튼 */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
        >
          <Printer size={16} />
          인쇄
        </button>
      </div>

      {/* 완제품 시험기준 */}
      <div className="bg-white border-2 border-slate-800 print:border-black">
        {/* 헤더 */}
        <div className="text-center py-4 border-b-2 border-slate-800">
          <h1 className="text-lg font-bold tracking-wider text-slate-800">완제품 시험기준 및 시험방법</h1>
        </div>

        {/* 제품 정보 헤더 */}
        <div className="grid grid-cols-4 border-b border-slate-300 text-sm">
          <div className="col-span-1 px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">
            제 품 명
          </div>
          <div className="col-span-1 px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">
            제품코드
          </div>
          <div className="col-span-1 px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">
            작성일자
          </div>
          <div className="col-span-1 px-4 py-2 bg-slate-100 text-center font-semibold text-slate-600">
            작성자
          </div>
        </div>
        <div className="grid grid-cols-4 border-b border-slate-300 text-sm">
          <div className="col-span-1 px-4 py-3 border-r border-slate-300 text-slate-800">
            {product.korean_name || "—"}
          </div>
          <div className="col-span-1 px-4 py-3 border-r border-slate-300 font-mono text-slate-700">
            {product.product_code}
          </div>
          <div className="col-span-1 px-4 py-3 border-r border-slate-300 text-slate-700">
            {product.created_date || "—"}
          </div>
          <div className="col-span-1 px-4 py-3 text-slate-700">
            —
          </div>
        </div>

        {/* 시험 항목 테이블 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">순번</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-28">항 목</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300">시 험 기 준</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-32">시 험 방 법</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600 w-24">비 고</th>
            </tr>
          </thead>
          <tbody>
            {testSpecs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  이 품목의 완제품 시험기준 데이터가 없습니다
                </td>
              </tr>
            ) : (
              testSpecs.map((spec) => (
                <tr key={spec.id} className="border-b border-slate-200 hover:bg-amber-50/30">
                  <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200">{spec.order}</td>
                  <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-200">{spec.test_item}</td>
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{spec.specification || "—"}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-600 border-r border-slate-200">{spec.test_method}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 참고사항 */}
        <div className="border-t border-slate-300 px-6 py-4 bg-slate-50">
          <p className="text-xs text-slate-600 mb-1">* 참 고 사 항 :</p>
          <p className="text-xs text-slate-600 ml-4">시 험 방 법</p>
          <p className="text-xs text-slate-600 ml-4">1. 화장품 기준 및 시험방법에 의거.</p>
        </div>

        {/* 서명란 */}
        <div className="border-t border-slate-300 px-6 py-6">
          <div className="flex justify-end gap-12">
            <div className="text-center">
              <div className="w-24 border-b border-slate-400 mb-1 h-10"></div>
              <span className="text-xs text-slate-500">작 성</span>
            </div>
            <div className="text-center">
              <div className="w-24 border-b border-slate-400 mb-1 h-10"></div>
              <span className="text-xs text-slate-500">검 토</span>
            </div>
            <div className="text-center">
              <div className="w-24 border-b border-slate-400 mb-1 h-10"></div>
              <span className="text-xs text-slate-500">승 인</span>
            </div>
          </div>
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-5xl, .max-w-5xl * { visibility: visible; }
          .max-w-5xl {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            max-width: 100%;
            padding: 15mm;
          }
        }
      `}</style>
    </div>
  );
}

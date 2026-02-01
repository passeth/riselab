"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product, ProductRevision } from "@/types/database";

interface ProductStandard extends Product {
  revisions: ProductRevision[];
}

export default function ProductStandardPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [data, setData] = useState<ProductStandard | null>(null);
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

      const { data: revisionsData, error: revErr } = await supabase
        .from("labdoc_product_revisions")
        .select("*")
        .eq("product_code", decodedProductCode)
        .order("revision_no", { ascending: true });

      if (revErr) console.error("Revisions fetch error:", revErr);

      setData({
        ...productData,
        revisions: revisionsData ?? [],
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-500 text-sm">{error || "품목을 찾을 수 없습니다"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 인쇄 버튼 (인쇄 시 숨김) */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
        >
          <Printer size={16} />
          인쇄
        </button>
      </div>

      {/* 제품표준서 본문 */}
      <div className="bg-white border-2 border-slate-800 print:border-black">
        {/* 제목 */}
        <div className="text-center py-6 border-b-2 border-slate-800 print:border-black">
          <h1 className="text-2xl font-bold tracking-[0.5em] text-slate-800">제 품 표 준 서</h1>
        </div>

        {/* 본문 테이블 */}
        <table className="w-full border-collapse text-sm">
          <tbody>
            {/* 제품명 + 관리번호 */}
            <tr className="border-b border-slate-300">
              <th className="w-28 px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-middle">
                제 품 명
              </th>
              <td className="px-3 py-3 text-slate-800" colSpan={2}>
                {data.korean_name || "—"}
              </td>
              <th className="w-24 px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-l border-r border-slate-300 align-middle">
                관리번호
              </th>
              <td className="w-28 px-3 py-3 text-slate-800 font-mono">
                {data.management_code || "—"}
              </td>
            </tr>

            {/* 제품약호 (영문명) */}
            <tr className="border-b border-slate-300">
              <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top" rowSpan={2}>
                제품약호
              </th>
              <td className="px-3 py-3 text-slate-800" colSpan={4}>
                {data.english_name || "—"}
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="px-3 py-3" colSpan={4}>
                <div className="flex items-center gap-8">
                  <span>
                    <span className="text-slate-500">코드 :</span>
                    <span className="ml-2 font-mono text-slate-800">{data.product_code}</span>
                  </span>
                  <span>
                    <span className="text-slate-500">작성일자</span>
                    <span className="ml-2 text-slate-800">{data.created_date || "—"}</span>
                  </span>
                </div>
              </td>
            </tr>

            {/* 유형 및 성상 */}
            <Row label="유형 및 성상" value={data.cosmetic_type ? `${data.cosmetic_type} / ${data.appearance || "—"}` : data.appearance} />

            {/* 원료약품분량 */}
            <Row label="원료약품분량" value="별첨.1" />

            {/* 제조공정 */}
            <Row label="제 조 공 정" value="별첨.2" />

            {/* 작업중 주의사항 */}
            <Row label="작업중 주의사항" value="별첨.3" />

            {/* 사용법 */}
            <Row label="사  용  법" value={data.usage_instructions} />

            {/* 용법·용량 */}
            <Row label="용법·용량" value={data.dosage || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} />

            {/* 효능·효과 */}
            <Row label="효능·효과" value={data.functional_claim || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} />

            {/* 사용시의 주의사항 */}
            <Row label="사용시의 주의사항" value={data.usage_precautions || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} />

            {/* 포장단위 */}
            <Row label="포장단위" value={data.packaging_unit} />

            {/* 저장방법 */}
            <Row label="저장방법" value={data.storage_method} />

            {/* 반제품 규격 */}
            <Row label="반제품 규격" value="별첨.6" />

            {/* 완제품 규격 */}
            <Row label="완제품 규격" value="별첨.7" />
          </tbody>
        </table>

        {/* 개정이력 */}
        <table className="w-full border-collapse text-sm border-t-2 border-slate-800 print:border-black">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-20 px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">
                일련번호
              </th>
              <th className="w-28 px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">
                개정년월일
              </th>
              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">
                개정사항
              </th>
              <th className="w-20 px-3 py-2 text-center font-semibold text-slate-700 border-b border-slate-300">
                개정자
              </th>
            </tr>
          </thead>
          <tbody>
            {data.revisions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  개정이력 없음
                </td>
              </tr>
            ) : (
              data.revisions.map((rev) => (
                <tr key={rev.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-300">
                    {rev.revision_no}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-300">
                    {rev.revision_date || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-300">
                    {rev.revision_content || "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-600">
                    {data.author || "—"}
                  </td>
                </tr>
              ))
            )}
            {/* 빈 행 추가 (최소 5행) */}
            {Array.from({ length: Math.max(0, 5 - data.revisions.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-slate-200">
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 20mm;
          }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr className="border-b border-slate-300">
      <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top whitespace-nowrap">
        {label}
      </th>
      <td className="px-3 py-3 text-slate-800" colSpan={4}>
        {value || "—"}
      </td>
    </tr>
  );
}

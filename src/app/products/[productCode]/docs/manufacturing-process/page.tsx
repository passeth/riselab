"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product } from "@/types/database";

interface ProcessRecord {
  id: string;
  product_code: string;
  product_name: string | null;
  batch_number: string | null;
  batch_unit: string | null;
  dept_name: string | null;
  actual_qty: string | null;
  mfg_date: string | null;
  operator: string | null;
  approver_1: string | null;
  approver_2: string | null;
  approver_3: string | null;
  notes_content: string | null;
  total_time: string | null;
  special_notes: string | null;
  step_count: number | null;
}

interface ProcessStep {
  id: string;
  step_num: number;
  step_type: string | null;
  step_name: string | null;
  step_desc: string | null;
  work_time: string | null;
  checker: string | null;
}

export default function ManufacturingProcessPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<Product | null>(null);
  const [processRecord, setProcessRecord] = useState<ProcessRecord | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
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
          setError("제품을 찾을 수 없습니다");
        } else {
          throw productErr;
        }
        setLoading(false);
        return;
      }

      setProduct(productData);

      // 2. 제조공정 기록 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: processData, error: processErr } = await (supabase as any)
        .from("labdoc_manufacturing_processes")
        .select("*")
        .eq("product_code", decodedProductCode)
        .single();

      if (processErr && processErr.code !== "PGRST116") {
        throw processErr;
      }

      if (processData) {
        setProcessRecord(processData);

        // 3. 공정 단계 조회
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: stepsData } = await (supabase as any)
          .from("labdoc_manufacturing_process_steps")
          .select("*")
          .eq("process_id", processData.id)
          .order("step_num", { ascending: true });

        if (stepsData) {
          setSteps(stepsData);
        }
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

  // 공정 단계와 유의사항 분리
  const { processSteps, workerNotes } = useMemo(() => {
    const processSteps = steps.filter(s => s.step_num < 100);
    const workerNotes = steps.find(s => s.step_type === "유의사항");
    return { processSteps, workerNotes };
  }, [steps]);

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
        <p className="text-red-500 text-sm">{error || "제품을 찾을 수 없습니다"}</p>
      </div>
    );
  }

  if (!processRecord) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">제조공정 기록이 없습니다</p>
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
          인쇄
        </button>
      </div>

      {/* Document */}
      <div className="bg-white border border-slate-300 print:border-black text-sm">
        {/* Title + Approval */}
        <div className="border-b border-slate-300">
          <div className="flex">
            {/* Title */}
            <div className="flex-1 p-4">
              <h1 className="text-2xl font-bold text-black text-center">제조공정지시 및 기록서</h1>
            </div>
            {/* Approval Box */}
            <div className="border-l border-slate-300 w-48">
              <div className="grid grid-cols-3 text-center text-xs">
                <div className="border-b border-r border-slate-300 py-1 bg-slate-50 font-medium">결</div>
                <div className="border-b border-r border-slate-300 py-1 bg-slate-50 font-medium">담 당</div>
                <div className="border-b border-slate-300 py-1 bg-slate-50 font-medium">부서장</div>
              </div>
              <div className="grid grid-cols-3 text-center text-xs">
                <div className="border-r border-slate-300 py-1">재</div>
                <div className="border-r border-slate-300 h-12"></div>
                <div className="h-12"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Name */}
        <div className="border-b border-slate-300 px-4 py-2 bg-slate-50">
          <p className="text-center font-medium text-black">
            {processRecord.product_name || product.korean_name || "—"}
          </p>
        </div>

        {/* Info Header */}
        <div className="border-b border-slate-300">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제품코드</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제조번호</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제조단위</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제조부명</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">실생산량</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제조년월일</th>
                <th className="px-2 py-1.5 font-medium text-black">제조자</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black font-mono">
                  {processRecord.product_code}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black">
                  {processRecord.batch_number || ""}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black">
                  {processRecord.batch_unit || "Kg"}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black">
                  {processRecord.dept_name || ""}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black">
                  {processRecord.actual_qty || "Kg"}
                </td>
                <td className="border-r border-slate-300 px-2 py-2 text-center text-black">
                  {processRecord.mfg_date || ""}
                </td>
                <td className="px-2 py-2 text-center text-black">
                  {processRecord.operator || ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Process Steps */}
        <div className="border-b border-slate-300">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black w-10">구분</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black w-24"></th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black">제 조 공 정</th>
                <th className="border-r border-slate-300 px-2 py-1.5 font-medium text-black w-20">작업시간</th>
                <th className="px-2 py-1.5 font-medium text-black w-16">확 인</th>
              </tr>
            </thead>
            <tbody>
              {processSteps.map((step, idx) => (
                <tr key={step.id} className="border-b border-slate-200 last:border-b-0">
                  <td className="border-r border-slate-300 px-2 py-3 text-center text-black font-medium">
                    {step.step_num}
                  </td>
                  <td className="border-r border-slate-300 px-2 py-3 text-center text-black whitespace-pre-line">
                    {step.step_name?.replace(/\\n/g, '\n') || ""}
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3 text-black whitespace-pre-line leading-relaxed">
                    {step.step_desc?.replace(/\\n/g, '\n') || ""}
                  </td>
                  <td className="border-r border-slate-300 px-2 py-3 text-center text-black">
                    {step.work_time || ""}
                  </td>
                  <td className="px-2 py-3 text-center text-black">
                    {step.checker || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer - Worker Notes & Special Notes */}
        <div className="border-b border-slate-300">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="border-r border-slate-300 px-3 py-2 bg-slate-50 font-medium text-black w-28 align-top">
                  작 업 자<br />유의사항
                </td>
                <td className="border-r border-slate-300 px-3 py-2 text-black whitespace-pre-line">
                  {workerNotes?.step_desc || processRecord.notes_content || ""}
                </td>
                <td className="px-3 py-2 text-black w-32 text-center">
                  <span className="text-slate-500">총소요시간</span>
                  <div className="mt-1">{processRecord.total_time || ""}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Special Notes */}
        {processRecord.special_notes && (
          <div className="px-4 py-3">
            <p className="text-xs text-black">
              <span className="font-medium">특이사항:</span> {processRecord.special_notes}
            </p>
          </div>
        )}
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
          .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

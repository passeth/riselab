"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trash2, Save, Download, Loader2 } from "lucide-react";
import type { TestReport, TestReportItem } from "@/types/database";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  PASS: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  FAIL: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  PENDING: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

const JUDGMENT_BORDER: Record<string, string> = {
  PASS: "border-l-emerald-400",
  FAIL: "border-l-red-400",
  PENDING: "border-l-slate-200",
};

export default function TestReportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<TestReport | null>(null);
  const [items, setItems] = useState<TestReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, itemsRes] = await Promise.all([
        supabase.from("lab_reports").select("*").eq("id", id).single(),
        supabase
          .from("lab_report_items")
          .select("*")
          .eq("report_id", id)
          .order("display_order", { ascending: true }),
      ]);
      if (reportRes.error) throw reportRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setReport(reportRes.data);
      setItems(itemsRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateItemField = (
    idx: number,
    field: "test_result" | "judgment",
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
    setDirty(true);
  };

  const saveItems = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const item of items) {
        const { error: err } = await supabase
          .from("lab_report_items")
          .update({
            test_result: item.test_result || null,
            judgment: item.judgment,
          })
          .eq("id", item.id);
        if (err) throw err;
      }
      setDirty(false);
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async () => {
    if (!confirm("이 성적서와 관련된 모든 항목이 삭제됩니다. 진행하시겠습니다?"))
      return;
    try {
      const { error: err } = await supabase
        .from("lab_reports")
        .delete()
        .eq("id", id);
      if (err) throw err;
      router.push("/test-reports");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const exportPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      doc.setFont("Helvetica");
      doc.setFontSize(16);
      doc.text("Test Report", 10, 15);
      doc.setFontSize(10);
      doc.text(`Report: ${report.report_number}`, 10, 25);
      doc.text(`Ingredient: ${report.ingredient_code} - ${report.ingredient_name || ""}`, 10, 32);
      doc.text(`Lot: ${report.lot_number}`, 10, 39);
      doc.text(`Date: ${report.test_date}`, 10, 46);
      doc.text(`Tester: ${report.tester_name}`, 10, 53);
      doc.text(`Result: ${report.overall_result}`, 10, 60);

      const tableData = items.map((item) => [
        item.test_item,
        item.specification,
        item.test_result || "-",
        item.judgment,
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["Test Item", "Specification", "Result", "Judgment"]],
        body: tableData,
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.save(`${report.report_number}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 실패");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          href="/test-reports"
          className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-red-500 text-sm font-medium">
            {error || "성적서를 찾을 수 없습니다"}
          </p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const statusStyle = STATUS_STYLES[report.overall_result] ?? STATUS_STYLES.PENDING;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/test-reports"
          className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline transition-colors"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-1">
          <button
            onClick={saveItems}
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 ${
              dirty
                ? "bg-amber-400 text-slate-900 hover:bg-amber-300 hover:shadow-md"
                : "text-slate-300 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            저장
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-all duration-200"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={deleteReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm transition-all duration-200"
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block font-mono text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded mb-2 hover:bg-amber-100 hover:text-amber-600 transition-colors duration-200">
              {report.report_number}
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {report.ingredient_name || report.ingredient_code}
            </h1>
          </div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            {report.overall_result}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4 text-sm">
          {[
            ["원료코드", report.ingredient_code],
            ["Lot 번호", report.lot_number],
            ["시험일자", report.test_date],
            ["시험자", report.tester_name],
            ["비고", report.notes],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2.5 items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-14 flex-shrink-0">{label}</span>
              <span className="text-slate-600 text-sm">{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">시험 결과 항목</h2>
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-300 text-sm">등록된 시험 항목이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">시험항목</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">시험기준</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">시험결과</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">적부판정</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-50 border-l-2 ${JUDGMENT_BORDER[item.judgment]} transition-colors duration-200`}
                  >
                    <td className="px-3 py-2 text-slate-600 font-medium">
                      {item.test_item}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {item.specification}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.test_result || ""}
                        onChange={(e) =>
                          updateItemField(idx, "test_result", e.target.value)
                        }
                        placeholder="결과 입력"
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.judgment}
                        onChange={(e) =>
                          updateItemField(idx, "judgment", e.target.value)
                        }
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white transition-all duration-200"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

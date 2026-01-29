"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Loader2 } from "lucide-react";
import type { Database } from "@/types/database";

type RecentReport = Database["public"]["Views"]["lab_recent_reports"]["Row"];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PASS: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  FAIL: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  PENDING: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

export default function TestReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-amber-500" /></div>}>
      <TestReports />
    </Suspense>
  );
}

function TestReports() {
  const searchParams = useSearchParams();
  const ingredientFilter = searchParams.get("ingredient");

  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(ingredientFilter ?? "");
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("lab_recent_reports")
        .select("*")
        .order("test_date", { ascending: false });
      if (ingredientFilter) {
        query = query.eq("ingredient_code", ingredientFilter);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      setReports(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [ingredientFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter(
    (r) =>
      r.ingredient_code.toLowerCase().includes(search.toLowerCase()) ||
      (r.ingredient_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      r.report_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">시험성적서</h1>
          <p className="text-sm text-slate-400 mt-1">
            총 <span className="font-semibold text-slate-600">{reports.length}</span>건
            {ingredientFilter && (
              <span className="ml-2 text-xs text-amber-600 font-medium">— {ingredientFilter} 필터</span>
            )}
          </p>
        </div>
        <Link
          href="/test-reports/new"
          className="flex items-center gap-2 bg-amber-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-300 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          <Plus size={15} />
          새 성적서 생성
        </Link>
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            searchFocused ? "text-amber-500" : "text-slate-300"
          }`}
        />
        <input
          type="text"
          placeholder="성적서번호, 원료코드, Lot번호로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white transition-all duration-200"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 text-sm font-medium">오류 발생</p>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
            <button onClick={fetchReports} className="mt-3 text-amber-600 text-sm hover:underline">다시 시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-300 text-sm">
              {search ? "검색 결과가 없습니다" : "등록된 성적서가 없습니다. 새 성적서를 생성해보세요."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">성적서번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">원료코드</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">원료명</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lot 번호</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">시험일자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">시험자</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">적부판정</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">항목</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((report) => {
                  const style = STATUS_STYLES[report.overall_result] ?? STATUS_STYLES.PENDING;
                  return (
                    <tr key={report.id} className="border-b border-slate-50 hover:bg-amber-50/40 border-l-3 border-l-transparent hover:border-l-amber-400 cursor-pointer transition-all duration-200 group">
                      <td className="px-4 py-3">
                        <Link href={`/test-reports/${report.id}`}
                          className="font-mono text-xs text-slate-600 hover:text-amber-600 transition-colors duration-200">
                          {report.report_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors duration-200">
                          {report.ingredient_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{report.ingredient_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{report.lot_number}</td>
                      <td className="px-4 py-3 text-slate-400">{report.test_date}</td>
                      <td className="px-4 py-3 text-slate-400">{report.tester_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                          {report.overall_result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                        {report.pass_count}/{report.item_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

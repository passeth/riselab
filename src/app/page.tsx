"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Package, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const PAGE_SIZE = 50;

interface IngredientRow {
  ingredient_code: string;
  ingredient_name: string;
  manufacturer: string | null;
  coa_urls: string[] | null;
}

export default function Home() {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("labdoc_ingredients")
        .select("ingredient_code, ingredient_name, manufacturer, coa_urls", { count: "exact" });

      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(`ingredient_code.ilike.${term},ingredient_name.ilike.${term}`);
      }

      const { data, count, error: err } = await query
        .order("ingredient_code", { ascending: true })
        .range(from, to);

      if (err) throw err;
      setIngredients(data ?? []);
      setTotalCount(count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">원료 관리</h1>
        <p className="text-sm text-slate-400 mt-1">
          총 <span className="font-semibold text-slate-600">{totalCount.toLocaleString()}</span>개 원료
        </p>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="원료코드 또는 원료명 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchIngredients} className="mt-3 text-amber-600 text-sm hover:underline">
              다시 시도
            </button>
          </div>
        ) : ingredients.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              {debouncedSearch ? "검색 결과가 없습니다" : "등록된 원료가 없습니다"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-32">코드</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">원료명</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-40">제조원</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase w-24">COA</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item) => (
                  <tr key={item.ingredient_code} className="border-b border-slate-50 hover:bg-amber-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/ingredients/${encodeURIComponent(item.ingredient_code)}`}
                        className="font-mono text-xs text-amber-600 hover:underline"
                      >
                        {item.ingredient_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.ingredient_name}</td>
                    <td className="px-4 py-3 text-slate-400">{item.manufacturer || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.coa_urls && item.coa_urls.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {item.coa_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title={`COA ${item.coa_urls!.length > 1 ? `#${idx + 1}` : ""}`}
                            >
                              <FileText size={14} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, totalCount).toLocaleString()} / {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="text-slate-600" />
                  </button>
                  <span className="px-3 py-1 text-xs text-slate-600">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

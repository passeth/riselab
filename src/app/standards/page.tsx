"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, FileText, ChevronLeft, ChevronRight, Printer } from "lucide-react";

const PAGE_SIZE = 50;

interface ProductRow {
  product_code: string;
  korean_name: string | null;
  english_name: string | null;
  cosmetic_type: string | null;
  semi_product_code: string | null;
  created_date: string | null;
}

export default function StandardsListPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("labdoc_products")
        .select("product_code, korean_name, english_name, cosmetic_type, semi_product_code, created_date", { count: "exact" });

      if (debouncedSearch) {
        const searchTerm = `%${debouncedSearch}%`;
        query = query.or(
          `product_code.ilike.${searchTerm},korean_name.ilike.${searchTerm},english_name.ilike.${searchTerm},cosmetic_type.ilike.${searchTerm}`
        );
      }

      const { data, count, error: err } = await query
        .order("korean_name", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (err) throw err;

      setProducts(data ?? []);
      setTotalCount(count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">제품 표준서</h1>
          <p className="text-sm text-slate-400 mt-1">
            총 <span className="font-semibold text-slate-600">{totalCount.toLocaleString()}</span>개 품목
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="품목코드, 품목명, 품목구분 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white"
        />
        {search && !loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {totalCount.toLocaleString()}건
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 text-sm font-medium">오류 발생</p>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
            <button onClick={fetchProducts} className="mt-3 text-amber-600 text-sm hover:underline">
              다시 시도
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              {debouncedSearch ? "검색 결과가 없습니다" : "등록된 품목이 없습니다"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                      품목코드
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      품목명
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                      품목구분
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                      반제품코드
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                      작성일
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
                      문서
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.product_code}
                      className="border-b border-slate-50 hover:bg-amber-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500">
                          {p.product_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium truncate max-w-sm">
                          {p.korean_name || p.english_name || "—"}
                        </div>
                        {p.english_name && p.korean_name && (
                          <div className="text-xs text-slate-400 truncate max-w-sm">
                            {p.english_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.cosmetic_type ? (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                            {p.cosmetic_type}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-400">
                          {p.semi_product_code || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {p.created_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/products/${encodeURIComponent(p.product_code)}/docs/standard`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs rounded transition-colors"
                          title="제품표준서 보기"
                        >
                          <FileText size={14} />
                          <span className="hidden sm:inline">표준서</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, totalCount).toLocaleString()} / {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="text-slate-600" />
                  </button>
                  <span className="px-3 py-1 text-xs text-slate-600">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext}
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

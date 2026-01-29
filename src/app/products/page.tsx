"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Box } from "lucide-react";
import type { LabProduct } from "@/types/database";

interface ProductSummary {
  prdcode: string;
  product_name: string;
  category: string | null;
  bom_version: string | null;
  semi_product_code: string | null;
  has_components: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("lab_products")
        .select("*")
        .eq("status", "active")
        .order("product_name", { ascending: true });

      if (err) throw err;

      const productList: ProductSummary[] = (data ?? []).map((row: LabProduct) => ({
        prdcode: row.prdcode,
        product_name: row.product_name,
        category: row.category,
        bom_version: row.bom_version,
        semi_product_code: row.semi_product_code,
        has_components: !!row.semi_product_code,
      }));

      setProducts(productList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter(
    (p) =>
      p.prdcode.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.semi_product_code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">품목관리</h1>
          <p className="text-sm text-slate-400 mt-1">
            총 <span className="font-semibold text-slate-600">{products.length}</span>개 품목
          </p>
        </div>
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
          placeholder="품목코드, 품목명, 품목구분으로 검색..."
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
            <button onClick={fetchProducts} className="mt-3 text-amber-600 text-sm hover:underline">
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Box size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-300 text-sm">
              {search ? "검색 결과가 없습니다" : "등록된 품목이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    품목코드
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    품목명
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    품목구분
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    반제품코드
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    성분
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.prdcode}
                    className="border-b border-slate-50 hover:bg-amber-50/40 border-l-3 border-l-transparent hover:border-l-amber-400 cursor-pointer transition-all duration-200 group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${encodeURIComponent(product.prdcode)}`}
                        className="font-mono text-xs text-slate-600 hover:text-amber-600 transition-colors duration-200"
                      >
                        {product.prdcode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{product.product_name}</td>
                    <td className="px-4 py-3">
                      {product.category ? (
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors duration-200">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {product.semi_product_code || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.has_components ? (
                        <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" title="성분 매핑됨" />
                      ) : (
                        <span className="inline-block w-2 h-2 bg-slate-200 rounded-full" title="성분 미매핑" />
                      )}
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

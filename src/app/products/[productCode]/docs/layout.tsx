"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  FileText, List, Globe, FileBox, AlertTriangle, Layers, BarChart3, 
  ClipboardCheck, FlaskConical, Package, Search, Loader2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from "lucide-react";

const PAGE_SIZE = 100;

interface DocLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  group?: string;
}

interface ProductItem {
  product_code: string;
  korean_name: string | null;
}

const docLinks: DocLink[] = [
  // 기본 문서
  { href: "standard", label: "제품표준서", icon: FileText, group: "기본" },
  
  // 성분표
  { href: "ingredients/ko", label: "국문 성분표", icon: List, group: "성분표" },
  { href: "ingredients/en", label: "영문 성분표", icon: Globe, group: "성분표" },
  { href: "ingredients/breakdown", label: "브레이크다운", icon: Layers, group: "성분표" },
  { href: "ingredients/summary", label: "INCI 합산", icon: BarChart3, group: "성분표" },
  
  // 시험성적서
  { href: "specs/en", label: "영문 성적서", icon: ClipboardCheck, group: "시험" },
  { href: "specs/semi", label: "반제품 기준", icon: FlaskConical, group: "시험" },
  { href: "specs/final", label: "완제품 기준", icon: Package, group: "시험" },
  
  // 기타
  { href: "raw-materials/coa", label: "원료 COA", icon: FileBox, group: "기타" },
  { href: "msds", label: "MSDS", icon: AlertTriangle, group: "기타" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const basePath = `/products/${productCode}/docs`;
  
  // 사이드바 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  
  // 현재 탭 경로 추출 (예: standard, ingredients/ko 등)
  const currentDocPath = pathname.replace(basePath + "/", "").split("/").slice(0, 2).join("/");
  
  // 활성 아이템 ref (스크롤용)
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // 검색 시 첫 페이지로
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("labdoc_products")
        .select("product_code, korean_name", { count: "exact" })
        .order("korean_name", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(`product_code.ilike.${term},korean_name.ilike.${term}`);
      }

      const { data, count } = await query;
      setProducts(data ?? []);
      setTotalCount(count ?? 0);
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 현재 선택된 품목으로 스크롤
  useEffect(() => {
    if (!loading && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [loading, decodedProductCode]);

  // 페이지 변경 시 리스트 맨 위로 스크롤
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <div className="flex gap-0 -m-6">
      {/* 품목 사이드바 */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden relative h-[calc(100vh-3.5rem)]`}
      >
        {/* 검색 헤더 */}
        <div className="p-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="품목 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 px-0.5">
            {loading ? "로딩중..." : `${products.length}개 품목`}
          </p>
        </div>
        
        {/* 품목 리스트 (스크롤) */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-amber-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {debouncedSearch ? "검색 결과 없음" : "품목 없음"}
            </div>
          ) : (
            <nav className="py-1">
              {products.map((p) => {
                const isActive = p.product_code === decodedProductCode;
                const href = `/products/${encodeURIComponent(p.product_code)}/docs/${currentDocPath || "standard"}`;
                return (
                  <Link
                    key={p.product_code}
                    ref={isActive ? activeItemRef : null}
                    href={href}
                    className={`block px-3 py-2 text-xs border-l-2 transition-colors ${
                      isActive
                        ? "bg-amber-50 border-amber-400 text-amber-700 font-medium"
                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-400 block">{p.product_code}</span>
                    <span className="line-clamp-1">{p.korean_name || "—"}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <span className="text-[10px] text-slate-400">
              {page + 1}/{totalPages}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(0)}
                disabled={!hasPrev}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="처음"
              >
                <ChevronsLeft size={12} className="text-slate-500" />
              </button>
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={!hasPrev}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="이전"
              >
                <ChevronLeft size={12} className="text-slate-500" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNext}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="다음"
              >
                <ChevronRight size={12} className="text-slate-500" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={!hasNext}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="마지막"
              >
                <ChevronsRight size={12} className="text-slate-500" />
              </button>
            </div>
          </div>
        )}
        
        {/* 사이드바 토글 버튼 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-400 transition-colors shadow-sm z-10"
        >
          {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 p-6 overflow-auto h-[calc(100vh-3.5rem)]">
        {/* 문서 탭 네비게이션 */}
        <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-200 pb-2">
          {docLinks.map((link) => {
            const fullHref = `${basePath}/${link.href}`;
            const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={fullHref}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}

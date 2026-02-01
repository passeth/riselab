"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { FileText, List, Globe, FileBox, AlertTriangle, Layers, BarChart3, ClipboardCheck, FlaskConical, Package } from "lucide-react";

interface DocLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  group?: string;
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
  const basePath = `/products/${productCode}/docs`;

  return (
    <div>
      {/* 문서 탭 네비게이션 */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 pb-2">
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
  );
}

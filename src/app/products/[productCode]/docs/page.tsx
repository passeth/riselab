"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, List, Globe, FileBox, AlertTriangle, ChevronRight } from "lucide-react";

const docCards = [
  {
    href: "standard",
    label: "제품표준서",
    description: "제품 규격 및 품질 기준",
    icon: FileText,
  },
  {
    href: "ingredients/ko",
    label: "국문 성분표",
    description: "국문 전성분 목록",
    icon: List,
  },
  {
    href: "ingredients/en",
    label: "영문 성분표",
    description: "INCI 기반 영문 성분표",
    icon: Globe,
  },
  {
    href: "raw-materials/coa",
    label: "원료 COA",
    description: "원료 시험성적서",
    icon: FileBox,
  },
  {
    href: "msds",
    label: "MSDS",
    description: "물질안전보건자료",
    icon: AlertTriangle,
  },
];

export default function DocsHubPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const basePath = `/products/${productCode}/docs`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">제품 문서</h2>
        <p className="text-sm text-slate-500 mt-1">
          필요한 문서를 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {docCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={`${basePath}/${card.href}`}
              className="group flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <Icon size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                  {card.label}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {card.description}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="flex-shrink-0 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

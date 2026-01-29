"use client";

import { Noto_Sans_KR, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Package, FileText, ChevronLeft, ChevronRight, Box } from "lucide-react";
import { useState } from "react";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const navItems = [
  { href: "/", label: "원료관리", icon: Package },
  { href: "/test-reports", label: "시험성적서", icon: FileText },
  { href: "/products", label: "품목관리", icon: Box },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html lang="ko">
      <head>
        <title>EVAS 원료관리 시스템</title>
      </head>
      <body
        className={`${notoSansKr.variable} ${cormorantGaramond.variable} font-sans antialiased`}
      >
        <div className="flex h-screen bg-slate-50">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-0 overflow-hidden"
            } bg-gradient-to-b from-[#0f1623] via-[#111d2e] to-[#0d1420] text-white flex-shrink-0 transition-all duration-300 flex flex-col border-r border-slate-800 relative`}
          >
            {/* Logo */}
            <div className="px-5 pt-6 pb-5">
              <h1
                className="text-2xl italic font-600 text-amber-400 tracking-wide"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                EVAS
              </h1>
              <div className="mt-2 h-px bg-gradient-to-r from-slate-700 via-slate-600 to-transparent" />
              <p className="text-xs text-slate-500 mt-2 tracking-wider uppercase">
                원료관리 시스템
              </p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 pb-3 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/" || pathname.startsWith("/ingredients")
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-2 ${
                      active
                        ? "bg-slate-800/60 text-white border-amber-400"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-amber-400" : ""} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-800/60">
              <p className="text-xs text-slate-600 tracking-wider">v0.1.0</p>
            </div>

            {/* Toggle chevron */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-400 transition-colors shadow-md"
            >
              {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </aside>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-3 flex-shrink-0 shadow-sm">
              <span className="text-sm text-slate-400 font-medium tracking-wide">
                {pathname === "/"
                  ? "원료관리"
                  : pathname === "/test-reports"
                  ? "시험성적서"
                  : pathname === "/test-reports/new"
                  ? "새 성적서 생성"
                  : pathname.startsWith("/ingredients")
                  ? "원료 상세"
                  : pathname.startsWith("/test-reports")
                  ? "성적서 상세"
                  : ""}
              </span>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto p-6 bg-slate-50">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

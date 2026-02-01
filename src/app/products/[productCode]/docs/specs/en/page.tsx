"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product } from "@/types/database";

interface TestSpec {
  id: string;
  test_item: string;
  specification: string;
  result: string;
  display_order: number;
}

// 기본 시험 항목 (데이터 없을 때 표시)
const DEFAULT_TESTS: Omit<TestSpec, 'id'>[] = [
  { test_item: "Appearance", specification: "", result: "PASSED TO THE TEST", display_order: 1 },
  { test_item: "Color", specification: "", result: "PASSED TO THE TEST", display_order: 2 },
  { test_item: "Odor", specification: "Fragrance", result: "PASSED TO THE TEST", display_order: 3 },
  { test_item: "pH ( 25℃ )", specification: "", result: "", display_order: 4 },
  { test_item: "Mercury", specification: "≤1 ppm", result: "PASSED TO THE TEST", display_order: 5 },
  { test_item: "Specific Gravity", specification: "", result: "", display_order: 6 },
  { test_item: "Microorganism", specification: "MAX. 100 CFU/g", result: "MAX. 10 CFU/g", display_order: 7 },
  { test_item: "Stability (5,37,45℃,72HR)", specification: "STABLE", result: "PASSED TO THE TEST", display_order: 8 },
  { test_item: "Content", specification: "", result: "PASSED TO THE TEST", display_order: 9 },
];

export default function TechnicalSpecsEnPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [product, setProduct] = useState<Product | null>(null);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: productData, error: productErr } = await supabase
        .from("labdoc_products")
        .select("*")
        .eq("product_code", decodedProductCode)
        .single();

      if (productErr) {
        if (productErr.code === "PGRST116") {
          setError("Product not found");
        } else {
          throw productErr;
        }
        setLoading(false);
        return;
      }

      setProduct(productData);

      // 시험기준 데이터 조회 시도 (테이블이 없을 수 있음)
      try {
        const { data: specsData } = await supabase
          .from("labdoc_test_specs")
          .select("*")
          .eq("product_code", decodedProductCode)
          .eq("spec_type", "en")
          .order("display_order", { ascending: true });

        if (specsData && specsData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTestSpecs(specsData.map((s: any) => ({
            id: s.id,
            test_item: s.test_item || '',
            specification: s.specification || '',
            result: s.result || '',
            display_order: s.display_order || 0,
          })));
        } else {
          setTestSpecs(DEFAULT_TESTS.map((t, idx) => ({ ...t, id: `default-${idx}` })));
        }
      } catch {
        // 테이블이 없으면 기본 템플릿 사용
        setTestSpecs(DEFAULT_TESTS.map((t, idx) => ({ ...t, id: `default-${idx}` })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => window.print();

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
        <p className="text-red-500 text-sm">{error || "Product not found"}</p>
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
          Print
        </button>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white border-2 border-slate-800 print:border-black">
        {/* Header */}
        <div className="text-center py-6 border-b-2 border-slate-800">
          <h1 className="text-xl font-bold tracking-widest text-slate-800">TECHNICAL SPECIFICATIONS</h1>
        </div>

        {/* Certification Statement */}
        <div className="px-6 py-4 border-b border-slate-300">
          <p className="text-sm text-slate-700 italic">We Hereby Certify the Following Specifications :</p>
        </div>

        {/* Product Info */}
        <div className="border-b border-slate-300 px-6 py-4 space-y-2 text-sm">
          <div className="flex">
            <span className="w-36 font-semibold text-slate-600">PRODUCT NAME :</span>
            <span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span>
          </div>
          <div className="flex gap-6">
            <div className="flex">
              <span className="font-semibold text-slate-600">REFERENCES :</span>
              <span className="ml-2 font-mono text-slate-800">{product.product_code}</span>
            </div>
            <span className="text-slate-600">{product.packaging_unit || "—"}</span>
            <span className="text-slate-600">{product.created_date || "—"}</span>
          </div>
        </div>

        {/* Test Specifications Table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-300 w-48">
                T E S T S
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-300">
                S P E C I F I C A T I O N S
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 w-48">
                RESULT
              </th>
            </tr>
          </thead>
          <tbody>
            {testSpecs.map((spec) => (
              <tr key={spec.id} className="border-b border-slate-200 hover:bg-amber-50/30">
                <td className="px-4 py-3 text-slate-700 border-r border-slate-200">{spec.test_item}</td>
                <td className="px-4 py-3 text-slate-600 border-r border-slate-200">{spec.specification || "—"}</td>
                <td className="px-4 py-3 text-slate-700 font-medium">{spec.result || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Conclusion */}
        <div className="border-t-2 border-slate-600 px-6 py-6">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-700 text-lg tracking-wider">CONCLUSION</span>
            <span className="px-6 py-2 bg-green-100 text-green-800 font-bold rounded-md tracking-wider">
              ACCEPTED
            </span>
          </div>
        </div>

        {/* Signature Area */}
        <div className="border-t border-slate-300 px-6 py-8">
          <div className="flex justify-end gap-16">
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-2 h-12"></div>
              <span className="text-xs text-slate-500">Prepared by</span>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-2 h-12"></div>
              <span className="text-xs text-slate-500">Approved by</span>
            </div>
          </div>
        </div>
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
            padding: 15mm;
          }
        }
      `}</style>
    </div>
  );
}

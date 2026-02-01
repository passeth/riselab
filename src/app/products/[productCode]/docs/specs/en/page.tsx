"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import type { Product } from "@/types/database";

interface TestSpec {
  id: string;
  order: number;
  test_item: string;
  specification: string;
  result: string;
}

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

      // labdoc_product_qc_specs 통합 테이블에서 영문 성적서 데이터 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: specsData, error: specsErr } = await (supabase as any)
        .from("labdoc_product_qc_specs")
        .select("*")
        .eq("product_code", decodedProductCode)
        .eq("qc_type", "완제품")
        .not("test_item_en", "is", null)
        .order("sequence_no", { ascending: true });

      if (specsErr) {
        console.error("English specs fetch error:", specsErr);
        setTestSpecs([]);
      } else if (specsData && specsData.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTestSpecs(specsData.map((s: any) => ({
          id: s.id,
          order: s.sequence_no || 0,
          test_item: s.test_item_en || '',
          specification: s.specification_en || '',
          result: s.result || '',
        })));
      } else {
        setTestSpecs([]);
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
            {testSpecs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No test specification data available for this product
                </td>
              </tr>
            ) : (
              testSpecs.map((spec) => (
                <tr key={spec.id} className="border-b border-slate-200 hover:bg-amber-50/30">
                  <td className="px-4 py-3 text-slate-700 border-r border-slate-200">{spec.test_item}</td>
                  <td className="px-4 py-3 text-slate-600 border-r border-slate-200">{spec.specification || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{spec.result || "—"}</td>
                </tr>
              ))
            )}
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

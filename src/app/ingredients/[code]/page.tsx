"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface IngredientData {
  ingredient_code: string;
  ingredient_name: string;
  manufacturer: string | null;
  origin_country: string | null;
}

interface ComponentData {
  id: string;
  component_order: number;
  inci_name_en: string | null;
  inci_name_kr: string | null;
  cas_number: string | null;
  composition_ratio: number | null;
  function: string | null;
}

export default function IngredientDetail() {
  const { code } = useParams<{ code: string }>();
  const decodedCode = decodeURIComponent(code);

  const [ingredient, setIngredient] = useState<IngredientData | null>(null);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 원료 기본 정보
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ingData, error: ingErr } = await (supabase as any)
        .from("labdoc_ingredients")
        .select("ingredient_code, ingredient_name, manufacturer, origin_country")
        .eq("ingredient_code", decodedCode)
        .single();

      if (ingErr) {
        if (ingErr.code === "PGRST116") {
          setError("원료를 찾을 수 없습니다");
        } else {
          throw ingErr;
        }
        setLoading(false);
        return;
      }

      setIngredient(ingData);

      // 성분 목록
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: compData, error: compErr } = await (supabase as any)
        .from("labdoc_ingredient_components")
        .select("id, component_order, inci_name_en, inci_name_kr, cas_number, composition_ratio, function")
        .eq("ingredient_code", decodedCode)
        .order("component_order", { ascending: true });

      if (compErr) throw compErr;
      setComponents(compData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [decodedCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !ingredient) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-4">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-500 text-sm">{error || "원료를 찾을 수 없습니다"}</p>
        </div>
      </div>
    );
  }

  const totalRatio = components.reduce((sum, c) => sum + (c.composition_ratio ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-4">
        <ArrowLeft size={14} /> 목록으로
      </Link>

      {/* 원료 정보 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-5">
        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-mono font-semibold rounded-md">
          {ingredient.ingredient_code}
        </span>
        <h1 className="text-xl font-bold text-slate-800 mt-3">{ingredient.ingredient_name}</h1>
        <div className="flex gap-6 mt-3 text-sm">
          <div>
            <span className="text-slate-400">제조원:</span>
            <span className="ml-2 text-slate-600">{ingredient.manufacturer || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400">원산지:</span>
            <span className="ml-2 text-slate-600">{ingredient.origin_country || "—"}</span>
          </div>
        </div>
      </div>

      {/* 성분 목록 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">성분 구성</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            Math.abs(totalRatio - 100) < 0.01 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            합계: {totalRatio.toFixed(2)}%
          </span>
        </div>

        {components.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">등록된 성분이 없습니다</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 w-12">순</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400">INCI (EN)</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400">INCI (KR)</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 w-28">CAS No.</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400 w-24">비율 %</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 w-32">기능</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp) => (
                <tr key={comp.id} className="border-t border-slate-50 hover:bg-amber-50/30">
                  <td className="px-3 py-2.5 text-center text-slate-400">{comp.component_order}</td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium">{comp.inci_name_en || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{comp.inci_name_kr || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">{comp.cas_number || "—"}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600 font-mono">
                    {comp.composition_ratio != null ? comp.composition_ratio.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs">{comp.function || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

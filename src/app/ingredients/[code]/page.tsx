"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Loader2, FileText } from "lucide-react";
import type {
  Ingredient,
  IngredientComponent,
  TestSpecification,
} from "@/types/database";

export default function IngredientDetail() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [components, setComponents] = useState<IngredientComponent[]>([]);
  const [specs, setSpecs] = useState<TestSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"components" | "specs">("components");
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [showSpecForm, setShowSpecForm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingRes, compRes, specRes] = await Promise.all([
        supabase.from("lab_ingredients").select("*").eq("code", code).single(),
        supabase
          .from("lab_components")
          .select("*")
          .eq("ingredient_code", code)
          .order("component_order", { ascending: true }),
        supabase
          .from("lab_test_specs")
          .select("*")
          .eq("ingredient_code", code)
          .order("display_order", { ascending: true }),
      ]);
      if (ingRes.error) throw ingRes.error;
      if (compRes.error) throw compRes.error;
      if (specRes.error) throw specRes.error;
      setIngredient(ingRes.data);
      setComponents(compRes.data ?? []);
      setSpecs(specRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteIngredient = async () => {
    if (!confirm("이 원료와 관련된 모든 성분, 시험기준 데이터가 삭제됩니다. 진행하시겠습니다?")) return;
    try {
      const { error: err } = await supabase.from("lab_ingredients").delete().eq("code", code);
      if (err) throw err;
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const deleteComponent = async (id: string) => {
    try {
      const { error: err } = await supabase.from("lab_components").delete().eq("id", id);
      if (err) throw err;
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const deleteSpec = async (id: string) => {
    try {
      const { error: err } = await supabase.from("lab_test_specs").delete().eq("id", id);
      if (err) throw err;
      setSpecs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

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
        <Link href="/" className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-4 transition-colors">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-red-500 text-sm font-medium">{error || "원료를 찾을 수 없습니다"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline transition-colors">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/test-reports?ingredient=${code}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <FileText size={13} /> 관련 성적서
          </Link>
          <button
            onClick={deleteIngredient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 hover:border-red-300 transition-all duration-200"
          >
            <Trash2 size={13} /> 삭제
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-start gap-3">
          <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-mono font-semibold rounded-md">
            {ingredient.code}
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mt-3 tracking-tight">
          {ingredient.name}
        </h1>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mt-4">
          {[
            ["제조원", ingredient.manufacturer],
            ["납품처", ingredient.supplier],
            ["채취방법", ingredient.sampling_method],
            ["채취장소", ingredient.sampling_location],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-14 flex-shrink-0">
                {label}
              </span>
              <span className="text-sm text-slate-600">{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setActiveTab("components")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "components"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          성분 목록
          <span className="ml-1.5 text-xs opacity-60">({components.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("specs")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "specs"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          시험기준
          <span className="ml-1.5 text-xs opacity-60">({specs.length})</span>
        </button>
      </div>

      {activeTab === "components" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">성분 목록</span>
            <button
              onClick={() => setShowComponentForm(true)}
              className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold hover:text-amber-500 transition-colors"
            >
              <Plus size={12} /> 성분 추가
            </button>
          </div>
          {components.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-300 text-sm">등록된 성분이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">순</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">영문 INCI</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">한글 INCI</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">CAS</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">조성비(%)</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Function</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">제조국</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((comp) => (
                    <tr key={comp.id} className="border-t border-slate-50 hover:bg-amber-50/30 transition-colors duration-200 group">
                      <td className="px-3 py-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                          {comp.component_order}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-medium">{comp.inci_name_en || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500">{comp.inci_name_kr || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono">{comp.cas_number || "—"}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 font-medium">
                        {comp.composition_ratio != null ? comp.composition_ratio.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{comp.function || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-400">{comp.country_of_origin || "—"}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => deleteComponent(comp.id)}
                          className="text-slate-200 group-hover:text-slate-400 hover:!text-red-500 transition-all duration-200"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {showComponentForm && (
            <ComponentForm
              ingredientCode={code}
              nextOrder={components.length + 1}
              onClose={() => setShowComponentForm(false)}
              onSuccess={fetchData}
            />
          )}
        </div>
      )}

      {activeTab === "specs" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">시험기준</span>
            <button
              onClick={() => setShowSpecForm(true)}
              className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold hover:text-amber-500 transition-colors"
            >
              <Plus size={12} /> 시험기준 추가
            </button>
          </div>
          {specs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-300 text-sm">등록된 시험기준이 없습니다</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">시험항목</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">시험기준</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {specs.map((spec) => (
                  <tr key={spec.id} className="border-t border-slate-50 hover:bg-amber-50/30 transition-colors duration-200 group">
                    <td className="px-4 py-2.5 text-slate-700 font-semibold">{spec.test_item}</td>
                    <td className="px-4 py-2.5 text-slate-500">{spec.specification}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => deleteSpec(spec.id)}
                        className="text-slate-200 group-hover:text-slate-400 hover:!text-red-500 transition-all duration-200"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showSpecForm && (
            <SpecForm
              ingredientCode={code}
              onClose={() => setShowSpecForm(false)}
              onSuccess={fetchData}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ComponentForm({
  ingredientCode, nextOrder, onClose, onSuccess,
}: {
  ingredientCode: string; nextOrder: number; onClose: () => void; onSuccess: () => void;
}) {
  const [order, setOrder] = useState(nextOrder);
  const [inciEn, setInciEn] = useState("");
  const [inciKr, setInciKr] = useState("");
  const [cas, setCas] = useState("");
  const [ratio, setRatio] = useState("");
  const [func, setFunc] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("lab_components").insert({
        ingredient_code: ingredientCode,
        component_order: order,
        inci_name_en: inciEn.trim() || null,
        inci_name_kr: inciKr.trim() || null,
        cas_number: cas.trim() || null,
        composition_ratio: ratio ? parseFloat(ratio) : null,
        function: func.trim() || null,
        country_of_origin: country.trim() || null,
      });
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-4">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">순서</label>
            <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">영문 INCI</label>
            <input value={inciEn} onChange={(e) => setInciEn(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">한글 INCI</label>
            <input value={inciKr} onChange={(e) => setInciKr(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">CAS 번호</label>
            <input value={cas} onChange={(e) => setCas(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">조성비(%)</label>
            <input type="number" step="0.01" value={ratio} onChange={(e) => setRatio(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Function</label>
            <input value={func} onChange={(e) => setFunc(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1 font-medium">제조국</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
        </div>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition-colors duration-200">취소</button>
          <button type="submit" disabled={submitting} className="px-3 py-1.5 text-xs bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-all duration-200 active:scale-95">
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SpecForm({
  ingredientCode, onClose, onSuccess,
}: {
  ingredientCode: string; onClose: () => void; onSuccess: () => void;
}) {
  const [testItem, setTestItem] = useState("");
  const [specification, setSpecification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("lab_test_specs").insert({
        ingredient_code: ingredientCode,
        test_item: testItem.trim(),
        specification: specification.trim(),
        display_order: 0,
      });
      if (err) throw err;
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-4">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">시험항목 <span className="text-red-400">*</span></label>
            <input required value={testItem} onChange={(e) => setTestItem(e.target.value)} placeholder="예: 성상"
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">시험기준 <span className="text-red-400">*</span></label>
            <input required value={specification} onChange={(e) => setSpecification(e.target.value)} placeholder="예: 백색의 결정성가루"
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition-colors duration-200">취소</button>
          <button type="submit" disabled={submitting} className="px-3 py-1.5 text-xs bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-50 transition-all duration-200 active:scale-95">
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

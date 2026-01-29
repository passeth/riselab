"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import type { Ingredient, TestSpecification } from "@/types/database";

interface ReportItem {
  test_item: string;
  specification: string;
  test_result: string;
  judgment: "PASS" | "FAIL" | "PENDING";
  display_order: number;
}

const JUDGMENT_BORDER: Record<string, string> = {
  PASS: "border-l-emerald-400",
  FAIL: "border-l-red-400",
  PENDING: "border-l-slate-200",
};

export default function NewTestReport() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [ingredientCode, setIngredientCode] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [testerName, setTesterName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = useCallback(async () => {
    setIngredientsLoading(true);
    try {
      const { data, error: err } = await supabase.from("lab_ingredients").select("*").order("code", { ascending: true });
      if (err) throw err;
      setIngredients(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "원료 목록 로드 실패");
    } finally {
      setIngredientsLoading(false);
    }
  }, []);

  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);

  const loadSpecs = useCallback(async (code: string) => {
    if (!code) { setItems([]); return; }
    try {
      const { data, error: err } = await supabase.from("lab_test_specs").select("*").eq("ingredient_code", code).order("display_order", { ascending: true });
      if (err) throw err;
      const specs = data ?? [];
      setItems(specs.map((spec: TestSpecification, idx: number) => ({
        test_item: spec.test_item, specification: spec.specification,
        test_result: "", judgment: "PENDING" as const, display_order: idx + 1,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "시험기준 로드 실패");
    }
  }, []);

  const handleIngredientChange = (code: string) => {
    setIngredientCode(code);
    loadSpecs(code);
  };

  const updateItem = (idx: number, field: keyof ReportItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { test_item: "", specification: "", test_result: "", judgment: "PENDING", display_order: prev.length + 1 }]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, display_order: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const selectedIngredient = ingredients.find((i) => i.code === ingredientCode);
      const { data: reportData, error: reportErr } = await supabase.from("lab_reports").insert({
        ingredient_code: ingredientCode,
        ingredient_name: selectedIngredient?.name ?? null,
        lot_number: lotNumber.trim(), test_date: testDate,
        tester_name: testerName.trim(), overall_result: "PENDING",
        notes: notes.trim() || null,
      }).select("*").single();
      if (reportErr) throw reportErr;

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("lab_report_items").insert(
          items.map((item) => ({
            report_id: reportData.id, test_item: item.test_item,
            specification: item.specification, test_result: item.test_result || null,
            judgment: item.judgment, display_order: item.display_order,
          }))
        );
        if (itemsErr) throw itemsErr;
      }
      router.push(`/test-reports/${reportData.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "성적서 생성 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/test-reports" className="inline-flex items-center gap-1.5 text-amber-600 text-sm hover:underline mb-2 transition-colors">
          <ArrowLeft size={14} /> 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">새 성적서 생성</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                원료코드 <span className="text-red-400">*</span>
              </label>
              <select required value={ingredientCode} onChange={(e) => handleIngredientChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white transition-all duration-200 appearance-none cursor-pointer">
                <option value="">원료를 선택해주세요</option>
                {ingredientsLoading ? <option disabled>로드 중...</option> : (
                  ingredients.map((ing) => <option key={ing.code} value={ing.code}>{ing.code} — {ing.name}</option>)
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Lot 번호 <span className="text-red-400">*</span>
              </label>
              <input required value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Lot 번호 입력"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                시험일자 <span className="text-red-400">*</span>
              </label>
              <input required type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                시험자명 <span className="text-red-400">*</span>
              </label>
              <input required value={testerName} onChange={(e) => setTesterName(e.target.value)} placeholder="시험자명 입력"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">비고</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="비고 입력 (선택)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              시험항목
              {ingredientCode && <span className="ml-2 text-slate-300 font-normal normal-case tracking-normal">(시험기준에서 자동 로드)</span>}
            </h2>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500 hover:bg-amber-50 px-2 py-1 rounded-lg transition-all duration-200">
              <Plus size={12} /> 항목 추가
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-300 text-sm">
                {ingredientCode ? "등록된 시험기준이 없습니다. 항목을 직접 추가해주세요." : "원료를 선택하면 시험기준이 자동 로드됩니다."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">시험항목</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">시험기준</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">시험결과</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-400 uppercase tracking-wider w-24">적부판정</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className={`border-t border-slate-50 border-l-2 ${JUDGMENT_BORDER[item.judgment]} transition-colors duration-200`}>
                      <td className="px-3 py-2">
                        <input value={item.test_item} onChange={(e) => updateItem(idx, "test_item", e.target.value)} placeholder="시험항목"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.specification} onChange={(e) => updateItem(idx, "specification", e.target.value)} placeholder="시험기준"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.test_result} onChange={(e) => updateItem(idx, "test_result", e.target.value)} placeholder="결과 입력"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={item.judgment} onChange={(e) => updateItem(idx, "judgment", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white transition-all duration-200">
                          <option value="PENDING">PENDING</option>
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-slate-200 hover:text-red-500 transition-colors duration-200">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link href="/test-reports" className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors duration-200">취소</Link>
          <button type="submit" disabled={submitting}
            className="px-8 py-2.5 text-sm bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95">
            {submitting ? (
              <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />생성 중...</span>
            ) : "성적서 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}

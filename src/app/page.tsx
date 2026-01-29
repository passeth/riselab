"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Search,
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Database, IngredientComponent } from "@/types/database";

type IngredientSummary = Database["public"]["Views"]["lab_ingredient_summary"]["Row"];

interface IngredientWithComponents extends IngredientSummary {
  components?: IngredientComponent[];
}

// 빈 성분 템플릿 생성
function createEmptyComponent(ingredientCode: string, order: number): Omit<IngredientComponent, "id" | "created_at"> & { id: string; created_at: string; isNew?: boolean } {
  return {
    id: `new-${Date.now()}-${order}`,
    ingredient_code: ingredientCode,
    component_order: order,
    inci_name_en: "",
    inci_name_kr: null,
    cas_number: null,
    composition_ratio: null,
    function: null,
    country_of_origin: null,
    created_at: new Date().toISOString(),
    isNew: true,
  };
}

export default function Home() {
  const [ingredients, setIngredients] = useState<IngredientWithComponents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // 확장된 행 관리
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // 편집 중인 성분 데이터 (원료코드 → 성분 배열)
  const [editingComponents, setEditingComponents] = useState<Map<string, (IngredientComponent & { isNew?: boolean })[]>>(new Map());
  
  // 저장 중인 행
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("lab_ingredient_summary")
        .select("*")
        .order("code", { ascending: true });
      if (err) throw err;
      setIngredients(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // 원료 확장 시 성분 데이터 로드
  const toggleExpand = useCallback(async (code: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(code)) {
      // 축소
      newExpanded.delete(code);
      setExpandedRows(newExpanded);
      // 편집 데이터 초기화
      const newEditing = new Map(editingComponents);
      newEditing.delete(code);
      setEditingComponents(newEditing);
    } else {
      // 확장 - 성분 데이터 로드
      newExpanded.add(code);
      setExpandedRows(newExpanded);
      
      // 이미 로드된 성분이 없으면 fetch
      const existing = ingredients.find(i => i.code === code);
      if (!existing?.components) {
        const { data: comps, error: compErr } = await supabase
          .from("lab_components")
          .select("*")
          .eq("ingredient_code", code)
          .order("component_order", { ascending: true });
        
        if (!compErr && comps) {
          setIngredients(prev => prev.map(ing => 
            ing.code === code ? { ...ing, components: comps } : ing
          ));
          // 편집용 복사본 생성
          setEditingComponents(prev => new Map(prev).set(code, [...comps]));
        }
      } else {
        // 이미 로드됨 - 편집용 복사본 생성
        setEditingComponents(prev => new Map(prev).set(code, [...existing.components!]));
      }
    }
  }, [expandedRows, editingComponents, ingredients]);

  // 성분 필드 수정
  const updateComponentField = useCallback((
    ingredientCode: string,
    componentId: string,
    field: keyof IngredientComponent,
    value: string | number | null
  ) => {
    setEditingComponents(prev => {
      const newMap = new Map(prev);
      const comps = newMap.get(ingredientCode);
      if (!comps) return prev;
      
      const updated = comps.map(c => 
        c.id === componentId ? { ...c, [field]: value } : c
      );
      newMap.set(ingredientCode, updated);
      return newMap;
    });
  }, []);

  // 성분 추가
  const addComponent = useCallback((ingredientCode: string) => {
    setEditingComponents(prev => {
      const newMap = new Map(prev);
      const comps = newMap.get(ingredientCode) ?? [];
      const maxOrder = comps.reduce((max, c) => Math.max(max, c.component_order), 0);
      const newComp = createEmptyComponent(ingredientCode, maxOrder + 1);
      newMap.set(ingredientCode, [...comps, newComp as IngredientComponent & { isNew?: boolean }]);
      return newMap;
    });
  }, []);

  // 성분 삭제 (로컬)
  const removeComponent = useCallback((ingredientCode: string, componentId: string) => {
    setEditingComponents(prev => {
      const newMap = new Map(prev);
      const comps = newMap.get(ingredientCode);
      if (!comps) return prev;
      newMap.set(ingredientCode, comps.filter(c => c.id !== componentId));
      return newMap;
    });
  }, []);

  // 변경사항 저장
  const saveChanges = useCallback(async (ingredientCode: string) => {
    const editedComps = editingComponents.get(ingredientCode);
    const originalComps = ingredients.find(i => i.code === ingredientCode)?.components ?? [];
    
    if (!editedComps) return;
    
    setSavingRows(prev => new Set(prev).add(ingredientCode));
    
    try {
      // 삭제된 성분 처리
      const editedIds = new Set(editedComps.map(c => c.id));
      const deletedIds = originalComps
        .filter(c => !editedIds.has(c.id))
        .map(c => c.id);
      
      if (deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from("lab_components")
          .delete()
          .in("id", deletedIds);
        if (delErr) throw delErr;
      }
      
      // 새 성분 추가
      const newComps = editedComps.filter(c => (c as { isNew?: boolean }).isNew);
      if (newComps.length > 0) {
        const toInsert = newComps.map(c => ({
          ingredient_code: c.ingredient_code,
          component_order: c.component_order,
          inci_name_en: c.inci_name_en || null,
          inci_name_kr: c.inci_name_kr || null,
          cas_number: c.cas_number || null,
          composition_ratio: c.composition_ratio,
          function: c.function || null,
          country_of_origin: c.country_of_origin || null,
        }));
        
        const { error: insErr } = await supabase
          .from("lab_components")
          .insert(toInsert);
        if (insErr) throw insErr;
      }
      
      // 기존 성분 업데이트
      const existingComps = editedComps.filter(c => !(c as { isNew?: boolean }).isNew);
      for (const comp of existingComps) {
        const original = originalComps.find(o => o.id === comp.id);
        if (!original) continue;
        
        // 변경된 필드만 업데이트
        const changes: Partial<IngredientComponent> = {};
        if (comp.inci_name_en !== original.inci_name_en) changes.inci_name_en = comp.inci_name_en;
        if (comp.inci_name_kr !== original.inci_name_kr) changes.inci_name_kr = comp.inci_name_kr;
        if (comp.cas_number !== original.cas_number) changes.cas_number = comp.cas_number;
        if (comp.composition_ratio !== original.composition_ratio) changes.composition_ratio = comp.composition_ratio;
        if (comp.function !== original.function) changes.function = comp.function;
        if (comp.country_of_origin !== original.country_of_origin) changes.country_of_origin = comp.country_of_origin;
        if (comp.component_order !== original.component_order) changes.component_order = comp.component_order;
        
        if (Object.keys(changes).length > 0) {
          const { error: updErr } = await supabase
            .from("lab_components")
            .update(changes)
            .eq("id", comp.id);
          if (updErr) throw updErr;
        }
      }
      
      // 새로고침
      const { data: refreshedComps } = await supabase
        .from("lab_components")
        .select("*")
        .eq("ingredient_code", ingredientCode)
        .order("component_order", { ascending: true });
      
      if (refreshedComps) {
        setIngredients(prev => prev.map(ing => 
          ing.code === ingredientCode 
            ? { ...ing, components: refreshedComps, component_count: refreshedComps.length }
            : ing
        ));
        setEditingComponents(prev => new Map(prev).set(ingredientCode, [...refreshedComps]));
      }
      
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(ingredientCode);
        return newSet;
      });
    }
  }, [editingComponents, ingredients]);

  // 변경사항 취소
  const cancelChanges = useCallback((ingredientCode: string) => {
    const original = ingredients.find(i => i.code === ingredientCode)?.components ?? [];
    setEditingComponents(prev => new Map(prev).set(ingredientCode, [...original]));
  }, [ingredients]);

  // 변경 여부 확인
  const hasChanges = useCallback((ingredientCode: string): boolean => {
    const edited = editingComponents.get(ingredientCode);
    const original = ingredients.find(i => i.code === ingredientCode)?.components ?? [];
    
    if (!edited) return false;
    if (edited.length !== original.length) return true;
    
    return edited.some((comp, idx) => {
      if ((comp as { isNew?: boolean }).isNew) return true;
      const orig = original[idx];
      if (!orig) return true;
      return (
        comp.inci_name_en !== orig.inci_name_en ||
        comp.inci_name_kr !== orig.inci_name_kr ||
        comp.cas_number !== orig.cas_number ||
        comp.composition_ratio !== orig.composition_ratio ||
        comp.function !== orig.function ||
        comp.component_order !== orig.component_order
      );
    });
  }, [editingComponents, ingredients]);

  const filtered = ingredients.filter(
    (i) =>
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            원료관리
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            총{" "}
            <span className="font-semibold text-slate-600">
              {ingredients.length}
            </span>
            건의 원료가 등록되어 있습니다
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-300 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          <Plus size={15} />
          원료 추가
        </button>
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
          placeholder="코드 또는 원료명으로 검색..."
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
            <button
              onClick={() => { setError(null); fetchIngredients(); }}
              className="mt-3 text-amber-600 text-sm hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={28} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              {search
                ? "검색 결과가 없습니다"
                : "등록된 원료가 없습니다. 원료를 추가해보세요."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    코드
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    원료명
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    제조원
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    납품처
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    성분수
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isExpanded = expandedRows.has(item.code);
                  const editedComps = editingComponents.get(item.code) ?? [];
                  const isSaving = savingRows.has(item.code);
                  const changed = hasChanges(item.code);
                  
                  // 조성비 합계 계산
                  const totalRatio = editedComps.reduce(
                    (sum, c) => sum + (c.composition_ratio ?? 0),
                    0
                  );
                  const isValid = Math.abs(totalRatio - 100) < 0.01;
                  
                  return (
                    <>
                      <tr
                        key={item.code}
                        className={`border-b border-slate-50 hover:bg-amber-50/40 cursor-pointer transition-all duration-200 group ${
                          isExpanded ? "bg-amber-50/30" : ""
                        }`}
                        onClick={() => toggleExpand(item.code)}
                      >
                        <td className="px-2 py-3 text-center">
                          <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-amber-500" />
                            ) : (
                              <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/ingredients/${item.code}`} onClick={e => e.stopPropagation()}>
                            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors duration-200">
                              {item.code}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/ingredients/${item.code}`}
                            onClick={e => e.stopPropagation()}
                            className="text-slate-700 font-medium hover:text-amber-600 transition-colors duration-200"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {item.manufacturer || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {item.supplier || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-medium">
                          {item.component_count}
                        </td>
                      </tr>
                      
                      {/* 이너테이블 - 성분 목록 */}
                      {isExpanded && (
                        <tr key={`${item.code}-expanded`}>
                          <td colSpan={6} className="p-0">
                            <div className="bg-slate-50/50 border-y border-slate-100">
                              {/* 이너테이블 헤더 */}
                              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-500 uppercase">
                                    성분 구성
                                  </span>
                                  {editedComps.length > 0 && (
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                      isValid 
                                        ? "bg-emerald-100 text-emerald-700" 
                                        : "bg-red-100 text-red-600"
                                    }`}>
                                      합계: {totalRatio.toFixed(2)}%
                                      {isValid ? (
                                        <Check size={12} className="inline ml-1" />
                                      ) : (
                                        <AlertCircle size={12} className="inline ml-1" />
                                      )}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {changed && (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); cancelChanges(item.code); }}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded transition-colors"
                                        disabled={isSaving}
                                      >
                                        <X size={12} /> 취소
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); saveChanges(item.code); }}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-400 text-slate-900 font-semibold rounded hover:bg-amber-300 disabled:opacity-50 transition-colors"
                                        disabled={isSaving}
                                      >
                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        저장
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); addComponent(item.code); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-amber-600 hover:bg-amber-100 rounded transition-colors font-medium"
                                  >
                                    <Plus size={12} /> 성분 추가
                                  </button>
                                </div>
                              </div>
                              
                              {/* 성분 테이블 */}
                              {editedComps.length === 0 ? (
                                <div className="py-8 text-center">
                                  <p className="text-slate-300 text-sm">등록된 성분이 없습니다</p>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); addComponent(item.code); }}
                                    className="mt-2 text-amber-600 text-xs hover:underline"
                                  >
                                    + 첫 번째 성분 추가
                                  </button>
                                </div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100/50">
                                      <th className="text-center px-2 py-2 font-semibold text-slate-400 uppercase w-12">순</th>
                                      <th className="text-left px-2 py-2 font-semibold text-slate-400 uppercase">영문 INCI</th>
                                      <th className="text-left px-2 py-2 font-semibold text-slate-400 uppercase w-32">한글 INCI</th>
                                      <th className="text-left px-2 py-2 font-semibold text-slate-400 uppercase w-28">CAS</th>
                                      <th className="text-right px-2 py-2 font-semibold text-slate-400 uppercase w-24">조성비(%)</th>
                                      <th className="text-left px-2 py-2 font-semibold text-slate-400 uppercase w-28">Function</th>
                                      <th className="w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {editedComps.map((comp, idx) => (
                                      <tr 
                                        key={comp.id} 
                                        className={`border-t border-slate-100 hover:bg-white transition-colors ${
                                          (comp as { isNew?: boolean }).isNew ? "bg-amber-50/50" : ""
                                        }`}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <td className="px-2 py-1.5 text-center">
                                          <input
                                            type="number"
                                            value={comp.component_order}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "component_order", parseInt(e.target.value) || 0)}
                                            className="w-10 px-1 py-1 text-center border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <input
                                            type="text"
                                            value={comp.inci_name_en ?? ""}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "inci_name_en", e.target.value || null)}
                                            placeholder="INCI Name (EN)"
                                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <input
                                            type="text"
                                            value={comp.inci_name_kr ?? ""}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "inci_name_kr", e.target.value || null)}
                                            placeholder="한글명"
                                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <input
                                            type="text"
                                            value={comp.cas_number ?? ""}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "cas_number", e.target.value || null)}
                                            placeholder="CAS No."
                                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={comp.composition_ratio ?? ""}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "composition_ratio", e.target.value ? parseFloat(e.target.value) : null)}
                                            placeholder="0.00"
                                            className="w-full px-2 py-1 text-right border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <input
                                            type="text"
                                            value={comp.function ?? ""}
                                            onChange={(e) => updateComponentField(item.code, comp.id, "function", e.target.value || null)}
                                            placeholder="Function"
                                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-amber-400 rounded text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40 transition-all"
                                          />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                          <button
                                            onClick={() => removeComponent(item.code, comp.id)}
                                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                            title="성분 삭제"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <IngredientModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchIngredients}
        />
      )}
    </div>
  );
}

function IngredientModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("lab_ingredients").insert({
        code: code.trim(),
        name: name.trim(),
        manufacturer: manufacturer.trim() || null,
        supplier: supplier.trim() || null,
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 tracking-tight">원료 추가</h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              코드 <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: MAA-0001"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              원료명 <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="원료명 입력"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                제조원
              </label>
              <input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="제조원"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                납품처
              </label>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="납품처"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all duration-200"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

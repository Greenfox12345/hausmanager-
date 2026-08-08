/**
 * PlansackVariablesPanel – Variablen-Bearbeitung für Plansack-Snapshots.
 * Arbeitet direkt auf dem lokalen Draft-State (kein tRPC-Backend).
 * Features: Kategorien, Schieberegler, Schloss, Alias, Bereichs-Erkennung,
 * Einheits-Vorschläge, Definitions-Erkennung aus Aufgabentexten, Lösch-Dialog.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Variable, Check, X, Trash2, Calculator, Keyboard, Lock, Unlock, Link2, Pencil } from "lucide-react";
import {
  extractVarNames,
  generateVarColor,
  countVarMentions,
  removeVarFromText,
  type PlanVariable,
  type RangeHint,
  type VarAssignment,
  evaluateAllVars,
  buildVarValueMap,
  extractRangeHintsFromTasks,
  extractVarAssignmentsFromTasks,
  topoSortVars,
} from "@/lib/varParser";
import { extractUnitHintsFromTasks, type UnitHint } from "@/lib/varParser";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PlanBagSnapshot } from "../../../drizzle/schema";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function isComputedVar(v: PlanVariable): boolean {
  if (!v.value) return false;
  return /VAR[A-Za-zÄÖÜäöüß]/.test(v.value);
}
function isDependentInputVar(v: PlanVariable): boolean {
  if (isComputedVar(v)) return false;
  return !!(v.min && /VAR[A-Za-zÄÖÜäöüß]/.test(v.min)) || !!(v.max && /VAR[A-Za-zÄÖÜäöüß]/.test(v.max));
}
function calcStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 2) return 0.01;
  if (range <= 5) return 0.05;
  if (range <= 10) return 0.1;
  if (range <= 20) return 0.25;
  if (range <= 50) return 0.5;
  if (range <= 200) return 1;
  if (range <= 1000) return 5;
  return Math.round(range / 200);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PlansackVariablesPanelProps {
  snapshot: PlanBagSnapshot;
  onChange: (updatedVars: PlanVariable[], enableVariables: boolean) => void;
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function PlansackVariablesPanel({ snapshot, onChange }: PlansackVariablesPanelProps) {
  const { t } = useTranslation("plankiste");

  const enableVariables = snapshot.enableVariables ?? false;
  const savedVariables: PlanVariable[] = (snapshot.variables ?? []) as PlanVariable[];

  // Alle VAR-Namen aus Aufgaben und Einkaufsartikeln extrahieren
  const allVarNames = new Set<string>();
  const taskItems = snapshot.taskItems ?? [];
  const shoppingItems = snapshot.shoppingItems ?? [];
  for (const item of taskItems) {
    extractVarNames(item.name ?? "").forEach(n => allVarNames.add(n));
    extractVarNames(item.description ?? "").forEach(n => allVarNames.add(n));
  }
  for (const item of shoppingItems) {
    extractVarNames(item.name ?? "").forEach(n => allVarNames.add(n));
    extractVarNames(item.quantity ?? "").forEach(n => allVarNames.add(n));
    extractVarNames(item.notes ?? "").forEach(n => allVarNames.add(n));
  }

  // Gespeicherte Variablen mit neu erkannten mergen
  const mergedVars: PlanVariable[] = [...savedVariables];
  for (const name of Array.from(allVarNames)) {
    if (!mergedVars.find(v => v.name === name)) {
      mergedVars.push({ name, color: generateVarColor(name) });
    }
  }

  // Kategorisieren
  const pureInputVars = topoSortVars(mergedVars.filter(v => !isComputedVar(v) && !isDependentInputVar(v)));
  const dependentInputVars = topoSortVars(mergedVars.filter(v => isDependentInputVar(v)));
  const computedVars = topoSortVars(mergedVars.filter(v => isComputedVar(v)));

  // Berechnete Werte
  const evaluatedVarsRaw = evaluateAllVars(mergedVars);
  const rawVarMap = buildVarValueMap(mergedVars);

  // Definitions-Erkennung aus Aufgabentexten
  // extractVarAssignmentsFromTasks braucht id: number, also synthetische IDs
  const tasksForAssign = taskItems.map((ti, idx) => ({
    id: idx,
    name: ti.name ?? "",
    description: ti.description ?? null,
  }));
  const varAssignments = extractVarAssignmentsFromTasks(tasksForAssign, rawVarMap);

  // Einheits-Hinweise
  const taskItemsForHints = taskItems.map(ti => ({ name: ti.name ?? "", description: ti.description ?? "" }));
  const unitHintsRaw = extractUnitHintsFromTasks(taskItemsForHints);
  const unitHints: Record<string, UnitHint | undefined> = {};
  for (const [name, hints] of Object.entries(unitHintsRaw)) {
    if (hints.length > 0) unitHints[name] = hints[0];
  }

  // Bereichs-Hinweise
  const rangeHints = extractRangeHintsFromTasks(taskItemsForHints);

  // Zählt Erwähnungen
  const countMentions = (varName: string): number => {
    let count = 0;
    for (const item of taskItems) {
      count += countVarMentions(item.name ?? "", varName);
      count += countVarMentions(item.description ?? "", varName);
    }
    for (const item of shoppingItems) {
      count += countVarMentions(item.name ?? "", varName);
      count += countVarMentions(item.quantity ?? "", varName);
    }
    return count;
  };

  // ─── State ────────────────────────────────────────────────────────────────
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");
  const [editingUnitVar, setEditingUnitVar] = useState<string | null>(null);
  const [unitDraft, setUnitDraft] = useState("");
  const [sliderDrafts, setSliderDrafts] = useState<Record<string, number>>({});
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deleteAlsoFromTexts, setDeleteAlsoFromTexts] = useState(false);
  const [rangeProposals, setRangeProposals] = useState<Array<{ varName: string; hint: RangeHint }>>([]);
  const [showRangeDialog, setShowRangeDialog] = useState(false);
  const [unitProposals, setUnitProposals] = useState<Array<{ varName: string; hint: UnitHint }>>([]);
  const [showUnitDialog, setShowUnitDialog] = useState(false);

  // ─── Auto-Zuweisung aus Definitions-Erkennung ─────────────────────────────
  useEffect(() => {
    if (!enableVariables) return;
    let changed = false;
    const updated = mergedVars.map(v => {
      let result = { ...v };
      // Auto-Wert aus Aufgaben-Zuweisungen (nur wenn noch kein Wert)
      if (!result.value) {
        const assignments = varAssignments[v.name];
        if (assignments && assignments.length > 0) {
          for (const a of assignments) {
            if (a.result?.ok) {
              changed = true;
              result = { ...result, value: a.result.display };
              break;
            }
          }
        }
      }
      // Auto-Einheit aus propagierter Einheit (nur wenn keine manuelle Einheit gesetzt)
      if (!result.unit) {
        const evalEntry = evaluatedVarsRaw[v.name];
        const propagatedUnit = evalEntry?.result?.ok ? evalEntry.result.unit : undefined;
        if (propagatedUnit) {
          changed = true;
          result = { ...result, unit: propagatedUnit };
        }
      }
      return result;
    });
    if (changed) {
      onChange(updated, enableVariables);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawVarMap), enableVariables]);

  // ─── Bereichs-Vorschläge prüfen ───────────────────────────────────────────
  useEffect(() => {
    if (!enableVariables) return;
    const proposals: Array<{ varName: string; hint: RangeHint }> = [];
    for (const [varName, hints] of Object.entries(rangeHints)) {
      const v = mergedVars.find(mv => mv.name === varName);
      if (!v) continue;
      for (const hint of hints) {
        if ((hint.min !== undefined && hint.min !== v.min) || (hint.max !== undefined && hint.max !== v.max)) {
          proposals.push({ varName, hint });
        }
      }
    }
    if (proposals.length > 0) {
      setRangeProposals(proposals);
      setShowRangeDialog(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rangeHints), enableVariables]);

  // ─── Aktionen ─────────────────────────────────────────────────────────────
  const saveVarEdit = (varName: string) => {
    const updated = mergedVars.map(v =>
      v.name === varName
        ? { ...v, value: editValue || undefined, unit: editUnit || undefined, color: editColor || v.color, alias: editAlias || undefined, min: editMin || undefined, max: editMax || undefined }
        : v
    );
    onChange(updated, enableVariables);
    setEditingVar(null);
  };

  const startEdit = (v: PlanVariable) => {
    setEditingVar(v.name);
    setEditValue(v.value ?? "");
    setEditUnit(v.unit ?? "");
    setEditColor(v.color);
    setEditAlias(v.alias ?? "");
    setEditMin(v.min ?? "");
    setEditMax(v.max ?? "");
  };

  const toggleLock = (varName: string) => {
    const updated = mergedVars.map(v => v.name === varName ? { ...v, locked: !v.locked } : v);
    onChange(updated, enableVariables);
  };

  const updateValue = (varName: string, newValue: string) => {
    const updated = mergedVars.map(v => v.name === varName ? { ...v, value: newValue } : v);
    onChange(updated, enableVariables);
  };

  const updateUnit = (varName: string, newUnit: string) => {
    const updated = mergedVars.map(v => v.name === varName ? { ...v, unit: newUnit || undefined } : v);
    onChange(updated, enableVariables);
    setEditingUnitVar(null);
  };

  const confirmDelete = (varName: string) => {
    const updatedVars = mergedVars.filter(v => v.name !== varName);
    onChange(updatedVars, enableVariables);
    setDeleteCandidate(null);
  };

  const toggleVariables = () => {
    onChange(mergedVars, !enableVariables);
  };

  // Numerischen Wert einer Variable auflösen
  const resolveNumeric = (val: string | undefined): number | undefined => {
    if (!val) return undefined;
    const n = parseFloat(val);
    if (!isNaN(n)) return n;
    const ev = evaluatedVarsRaw[val.replace(/^VAR/, "")];
    if (ev !== undefined) return parseFloat(String(ev.result));
    return undefined;
  };

  // ─── Variablen-Karte rendern ───────────────────────────────────────────────
  const renderVar = (v: PlanVariable) => {
    const ev = evaluatedVarsRaw[v.name];
    const res = ev?.result;
    const propagatedUnit = res?.ok ? res.unit : undefined;
    const displayUnit = v.unit ?? propagatedUnit;
    const unitMismatch = v.unit && propagatedUnit && v.unit !== propagatedUnit;
    const unitHint = unitHints[v.name];
    const hasNewUnit = unitHint && unitHint.unit !== v.unit;
    const mentions = countMentions(v.name);
    const isInput = !isComputedVar(v);
    const minNum = resolveNumeric(v.min);
    const maxNum = resolveNumeric(v.max);
    const currentNum = v.value ? parseFloat(v.value) : undefined;
    const hasSlider = isInput && !v.locked && minNum !== undefined && maxNum !== undefined && minNum < maxNum;
    const rangeHint = rangeHints[v.name]?.[0];
    const hasNewRange = rangeHint && (rangeHint.min !== v.min || rangeHint.max !== v.max);
    const assignments = varAssignments[v.name] ?? [];

    return (
      <div key={v.name} className="rounded-md border border-border bg-muted/30 p-2.5">
        {editingVar === v.name ? (
          /* ── Bearbeitungs-Modus ── */
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 flex-shrink-0" />
              <span className="text-sm font-mono font-medium break-all flex-1" style={{ color: editColor }}>VAR{v.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{t("variables.aliasLabel")}:</span>
              <Input placeholder="&KurzName" value={editAlias} onChange={e => setEditAlias(e.target.value.replace(/^&/, ""))} className="h-7 text-xs flex-1" />
            </div>
            <div className="flex gap-1.5">
              <Input placeholder={t("variables.valuePlaceholder")} value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs flex-1 min-w-0" />
              <Input placeholder={t("variables.unitPlaceholder")} value={editUnit} onChange={e => setEditUnit(e.target.value)} className="h-7 text-xs w-16 flex-shrink-0" />
            </div>
            {isInput && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{t("variables.rangeLabel")}:</span>
                <Input placeholder={t("variables.minPlaceholder")} value={editMin} onChange={e => setEditMin(e.target.value)} className="h-7 text-xs flex-1" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input placeholder={t("variables.maxPlaceholder")} value={editMax} onChange={e => setEditMax(e.target.value)} className="h-7 text-xs flex-1" />
              </div>
            )}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 flex-1" onClick={() => saveVarEdit(v.name)}>
                <Check className="w-3 h-3 mr-1" />{t("variables.save")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingVar(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          /* ── Anzeige-Modus ── */
          <div className="space-y-1.5">
            {/* Zeile 1: Name + Alias + Schloss + Buttons */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono font-medium break-all leading-tight" style={{ color: v.color }}>VAR{v.name}</span>
                {v.alias && <span className="ml-1.5 text-xs text-muted-foreground font-mono"><Link2 className="w-2.5 h-2.5 inline mr-0.5" />&{v.alias}</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{mentions}×</span>
                <button type="button" className={`p-0.5 transition-colors ${v.locked ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"}`} onClick={() => toggleLock(v.name)} title={v.locked ? t("variables.unlock") : t("variables.lock")}>
                  {v.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button type="button" className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => startEdit(v)} title={t("variables.editLabel", "Bearbeiten")}>
                  <Pencil className="w-3 h-3" />
                </button>
                <button type="button" className="text-muted-foreground hover:text-destructive p-0.5" onClick={() => { setDeleteCandidate(v.name); setDeleteAlsoFromTexts(false); }} title={t("variables.deleteLabel", "Löschen")}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Zeile 2: Wert / Definition */}
            <div className="text-xs text-muted-foreground">
              {v.value ? (
                <div className="flex flex-wrap items-center gap-1">
                  {!isComputedVar(v) && !v.locked ? (
                    <input
                      type="number"
                      value={v.value}
                      onChange={e => updateValue(v.name, e.target.value)}
                      className="h-6 w-20 text-xs border border-border rounded px-1 bg-background font-mono"
                    />
                  ) : (
                    <span className="font-mono break-all">= {v.value}</span>
                  )}
                  {res ? (
                    res.ok ? (
                      isComputedVar(v) ? (
                        <span className="text-emerald-600 font-medium whitespace-nowrap">
                          → {res.display}{displayUnit ? ` ${displayUnit}` : ""}
                        </span>
                      ) : null
                    ) : (
                      <span className="text-amber-500 cursor-help inline-flex items-center gap-0.5"
                        title={res.error === "missing_vars" ? t("variables.errorMissing", { vars: (res.missing ?? []).join(", ") }) : res.error === "cycle" ? t("variables.errorCycle") : res.error === "div_zero" ? t("variables.errorDivZero") : t("variables.errorParse")}>
                        → <span className="underline decoration-dotted">?</span>
                        <span className="text-[10px] opacity-70">({res.error === "missing_vars" ? `fehlt: ${(res.missing ?? []).slice(0, 2).join(", ")}` : res.error === "cycle" ? "Zyklus" : res.error === "div_zero" ? "÷0" : "Syntax"})</span>
                      </span>
                    )
                  ) : null}
                  {displayUnit && !isComputedVar(v) && <span className="text-muted-foreground">{displayUnit}</span>}
                </div>
              ) : (
                !isComputedVar(v) && !v.locked ? (
                  <input
                    type="number"
                    placeholder={t("variables.enterValue")}
                    onChange={e => e.target.value && updateValue(v.name, e.target.value)}
                    className="h-6 w-24 text-xs border border-border rounded px-1 bg-background"
                  />
                ) : (
                  <span className="italic">{t("variables.noValue")}</span>
                )
              )}
            </div>

            {/* Einheit – direkt editierbar */}
            <div className="flex items-center gap-1.5">
              {editingUnitVar === v.name ? (
                <>
                  <Input
                    value={unitDraft}
                    onChange={e => setUnitDraft(e.target.value)}
                    placeholder={t("variables.unitPlaceholder")}
                    className="h-6 w-20 text-xs"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") updateUnit(v.name, unitDraft); if (e.key === "Escape") setEditingUnitVar(null); }}
                  />
                  <button type="button" className="text-emerald-600 hover:text-emerald-700 p-0.5" onClick={() => updateUnit(v.name, unitDraft)}>
                    <Check className="w-3 h-3" />
                  </button>
                  <button type="button" className="text-muted-foreground p-0.5" onClick={() => setEditingUnitVar(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 group"
                  onClick={() => { setEditingUnitVar(v.name); setUnitDraft(v.unit ?? ""); }}
                  title={t("variables.unitPlaceholder")}
                >
                  {displayUnit ? (
                    <span className="font-mono">[{displayUnit}]</span>
                  ) : (
                    <span className="italic opacity-50">{t("variables.unitPlaceholder")}</span>
                  )}
                  {unitMismatch && <span className="text-amber-500 ml-0.5" title={`Berechnet: ${propagatedUnit}`}>⚠</span>}
                  <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}
            </div>

            {/* Schieberegler */}
            {hasSlider && (
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-10 text-right flex-shrink-0 font-mono">{minNum}</span>
                  <input
                    type="range" min={minNum} max={maxNum} step={calcStep(minNum!, maxNum!)}
                    value={sliderDrafts[v.name] ?? (currentNum ?? minNum)}
                    onChange={e => setSliderDrafts(prev => ({ ...prev, [v.name]: parseFloat(e.target.value) }))}
                    className="flex-1 h-3 accent-violet-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-muted-foreground w-10 flex-shrink-0 font-mono">{maxNum}</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {sliderDrafts[v.name] !== undefined && sliderDrafts[v.name] !== currentNum ? (
                    <>
                      <span className="text-xs font-mono text-muted-foreground line-through">{currentNum ?? "–"}{displayUnit ? ` ${displayUnit}` : ""}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs font-mono font-semibold text-emerald-600">{sliderDrafts[v.name]}{displayUnit ? ` ${displayUnit}` : ""}</span>
                      <button type="button" onClick={() => { updateValue(v.name, String(sliderDrafts[v.name])); setSliderDrafts(prev => { const n = { ...prev }; delete n[v.name]; return n; }); }} className="ml-1 px-2 py-0.5 rounded text-xs bg-emerald-500 text-white hover:bg-emerald-600">
                        {t("variables.save")}
                      </button>
                      <button type="button" onClick={() => setSliderDrafts(prev => { const n = { ...prev }; delete n[v.name]; return n; })} className="px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground border border-border">✕</button>
                    </>
                  ) : (
                    <span className="text-xs font-mono text-violet-600">{sliderDrafts[v.name] ?? currentNum ?? minNum}{displayUnit ? ` ${displayUnit}` : ""}</span>
                  )}
                </div>
              </div>
            )}

            {/* Bereichs-Hinweis */}
            {hasNewRange && rangeHint && (
              <button type="button" className="text-[11px] text-blue-500 hover:text-blue-600 underline decoration-dotted"
                onClick={() => { setRangeProposals([{ varName: v.name, hint: rangeHint }]); setShowRangeDialog(true); }}>
                {t("variables.rangeFoundInText", { min: rangeHint.min, max: rangeHint.max })}
              </button>
            )}

            {/* Einheits-Vorschlag */}
            {hasNewUnit && unitHint && (
              <button type="button" className="text-[11px] text-emerald-600 hover:text-emerald-700 underline decoration-dotted"
                onClick={() => { setUnitProposals([{ varName: v.name, hint: unitHint }]); setShowUnitDialog(true); }}>
                {t("variables.unitFoundInText", { unit: unitHint.unit })}
              </button>
            )}

            {/* Definitions-Matrix (mehrere Definitionen aus Aufgabentexten) */}
            {assignments.length > 1 && (
              <div className="mt-1 border-l-2 pl-2" style={{ borderColor: v.color }}>
                <p className="text-xs text-muted-foreground mb-1">{t("variables.matrixHint")}</p>
                <div className="space-y-0.5">
                  {assignments.map((a: VarAssignment, idx: number) => (
                    <div key={idx} className="text-xs flex flex-col gap-0.5 border-b border-border/30 pb-0.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground text-[11px]">{a.taskName}</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-mono break-all">{a.formula}</span>
                        {a.result?.ok
                          ? <span className="text-emerald-600 whitespace-nowrap">→ {a.result.display}{(v.unit ?? a.result.unit) ? ` ${v.unit ?? a.result.unit}` : ""}</span>
                          : <span className="text-amber-500">→ ?</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Einzelne Definition anzeigen wenn Wert aus Aufgabe stammt */}
            {assignments.length === 1 && assignments[0].result?.ok && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="italic">{assignments[0].taskName}:</span>
                <span className="font-mono">{assignments[0].formula}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Variablen-Schalter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-medium">{t("variables.title")}</span>
        </div>
        <button
          type="button"
          onClick={toggleVariables}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableVariables ? "bg-violet-600" : "bg-muted-foreground/30"}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enableVariables ? "translate-x-4.5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {enableVariables && (
        <div className="space-y-4">
          {/* Eingabe-Variablen */}
          {pureInputVars.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-700">{t("variables.inputVars")}</span>
              </div>
              {pureInputVars.map(renderVar)}
            </div>
          )}
          {/* Abhängige Eingabe-Variablen */}
          {dependentInputVars.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">{t("variables.dependentInputVars")}</span>
              </div>
              {dependentInputVars.map(renderVar)}
            </div>
          )}
          {/* Rechen-Variablen */}
          {computedVars.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-700">{t("variables.computedVars")}</span>
              </div>
              {computedVars.map(renderVar)}
            </div>
          )}
          {mergedVars.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("variables.noVars")}</p>
          )}
        </div>
      )}

      {/* ─── Dialoge ──────────────────────────────────────────────── */}

      {/* Bereichs-Vorschlag-Dialog */}
      <AlertDialog open={showRangeDialog} onOpenChange={setShowRangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.rangeProposalTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("variables.rangeDialogDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {rangeProposals.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono font-medium" style={{ color: mergedVars.find(v => v.name === p.varName)?.color }}>VAR{p.varName}</span>
                <span className="text-muted-foreground">{p.hint.min} ≤ x ≤ {p.hint.max}</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRangeDialog(false)}>{t("variables.rangeDialogIgnore")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const updated = mergedVars.map(v => {
                const proposal = rangeProposals.find(p => p.varName === v.name);
                if (!proposal) return v;
                return { ...v, min: proposal.hint.min ?? v.min, max: proposal.hint.max ?? v.max };
              });
              onChange(updated, enableVariables);
              setShowRangeDialog(false);
            }}>{t("variables.rangeDialogApply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Einheits-Vorschlag-Dialog */}
      <AlertDialog open={showUnitDialog} onOpenChange={open => { if (!open) setShowUnitDialog(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.unitDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("variables.unitDialogDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {unitProposals.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-violet-600">VAR{p.varName}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono font-semibold">{p.hint.unit}</span>
                <span className="text-[11px] text-muted-foreground italic">({p.hint.sourceText})</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("variables.rangeDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const updated = mergedVars.map(v => {
                const proposal = unitProposals.find(p => p.varName === v.name);
                if (!proposal) return v;
                return { ...v, unit: proposal.hint.unit };
              });
              onChange(updated, enableVariables);
              setShowUnitDialog(false);
            }}>{t("variables.unitDialogApply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lösch-Dialog */}
      <AlertDialog open={deleteCandidate !== null} onOpenChange={open => { if (!open) setDeleteCandidate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate && (() => {
                const cnt = countMentions(deleteCandidate);
                return cnt > 0
                  ? t("variables.deleteDescWithMentions", { name: deleteCandidate, count: cnt })
                  : t("variables.deleteDesc", { name: deleteCandidate });
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteCandidate && countMentions(deleteCandidate) > 0 && (
            <div className="flex items-center gap-2 py-2 px-4">
              <input type="checkbox" id="deleteFromTexts" checked={deleteAlsoFromTexts} onChange={e => setDeleteAlsoFromTexts(e.target.checked)} className="rounded" />
              <label htmlFor="deleteFromTexts" className="text-sm cursor-pointer">{t("variables.deleteAlsoFromTexts", { name: deleteCandidate })}</label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("variables.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCandidate && confirmDelete(deleteCandidate)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("variables.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

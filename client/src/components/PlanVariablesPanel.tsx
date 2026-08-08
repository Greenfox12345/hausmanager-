/**
 * PlanVariablesPanel – Variablen-Schalter und Variablen-Liste für Plankiste-Aufgaben-Vorlagen
 * Kategorien: Eingabe → Abhängige Eingabe → Rechen
 * Features: Schieberegler, Schloss, Alias (&Name), Bereichs-Erkennung
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Variable, Pencil, Check, X, Trash2, Calculator, Keyboard, Lock, Unlock, Link2 } from "lucide-react";
import {
  extractVarNames,
  generateVarColor,
  countVarMentions,
  removeVarFromText,
  type PlanVariable,
  type RangeHint,
} from "@/lib/varParser";
import {
  evaluateAllVars,
  extractVarAssignmentsFromTasks,
  buildVarValueMap,
  extractRangeHintsFromTasks,
  buildAliasMap,
  evaluateFormula,
} from "@/lib/varParser";
import {
  extractUnitHintsFromTasks,
  type UnitHint,
} from "@/lib/varParser";
import { topoSortVars } from "@/lib/varParser";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlanVariablesPanelProps {
  templateId: number;
  householdId: number;
  memberId: number;
}

/** Prüft ob eine Variable eine Rechen-Variable ist (enthält VAR-Referenz in value) */
function isComputedVar(v: PlanVariable): boolean {
  if (!v.value) return false;
  return /VAR[A-Za-zÄÖÜäöüß]/.test(v.value);
}

/** Prüft ob eine Variable eine abhängige Eingabe-Variable ist (min oder max enthält VAR-Referenz) */
function isDependentInputVar(v: PlanVariable): boolean {
  if (isComputedVar(v)) return false;
  const minHasVar = v.min ? /VAR[A-Za-zÄÖÜäöüß]/.test(v.min) : false;
  const maxHasVar = v.max ? /VAR[A-Za-zÄÖÜäöüß]/.test(v.max) : false;
  return minHasVar || maxHasVar;
}

export function PlanVariablesPanel({ templateId, householdId, memberId }: PlanVariablesPanelProps) {
  const { t } = useTranslation("plankiste");
  const utils = trpc.useUtils();

  const { data: template } = trpc.planTemplates.getTemplate.useQuery(
    { templateId }, { enabled: templateId > 0 }
  );
  const { data: taskItems = [] } = trpc.planTemplates.listTemplateTaskItems.useQuery(
    { templateId }, { enabled: templateId > 0 }
  );

  const updateMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
      utils.planTemplates.listTemplates.invalidate({ householdId });
    },
    onError: () => toast.error(t("variables.saveError")),
  });

  const bulkUpdateMutation = trpc.planTemplates.bulkUpdateTaskItems.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
    },
    onError: () => toast.error(t("variables.saveError")),
  });

  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");

  // Lokaler Schieberegler-State: varName → aktueller Draft-Wert (vor dem Speichern)
  const [sliderDrafts, setSliderDrafts] = useState<Record<string, number>>({});

  // Lösch-Dialog State
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deleteAlsoFromTexts, setDeleteAlsoFromTexts] = useState(false);

  // Bereichs-Vorschlag-Dialog State
  const [rangeProposals, setRangeProposals] = useState<Array<{varName: string; hint: RangeHint}>>([]);
  const [showRangeDialog, setShowRangeDialog] = useState(false);

  const enableVariables = (template as any)?.enableVariables ?? false;
  const savedVariables: PlanVariable[] = (template as any)?.variables ?? [];

  // Alle VAR-Namen aus allen Aufgaben extrahieren
  const allVarNames = new Set<string>();
  for (const item of taskItems as any[]) {
    extractVarNames(item.name ?? "").forEach((n: string) => allVarNames.add(n));
    extractVarNames(item.description ?? "").forEach((n: string) => allVarNames.add(n));
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

  // Zählt Erwähnungen einer Variable in allen Aufgaben
  const countMentions = (varName: string): number => {
    let count = 0;
    for (const item of taskItems as any[]) {
      count += countVarMentions(item.name ?? "", varName);
      count += countVarMentions(item.description ?? "", varName);
    }
    return count;
  };

  const toggleVariables = () => {
    updateMutation.mutate({
      templateId, householdId, memberId,
      enableVariables: !enableVariables,
      variables: mergedVars,
    });
  };

  const saveVarEdit = (varName: string) => {
    const updated = mergedVars.map(v =>
      v.name === varName
        ? {
            ...v,
            value: editValue || undefined,
            unit: editUnit || undefined,
            color: editColor || v.color,
            alias: editAlias || undefined,
            min: editMin || undefined,
            max: editMax || undefined,
          }
        : v
    );
    updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
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
    const updated = mergedVars.map(v =>
      v.name === varName ? { ...v, locked: !v.locked } : v
    );
    updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
  };

  const updateValue = (varName: string, newValue: string) => {
    const updated = mergedVars.map(v =>
      v.name === varName ? { ...v, value: newValue } : v
    );
    updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
  };

  // Variable aus der Liste löschen
  const confirmDelete = (varName: string) => {
    const updatedVars = mergedVars.filter(v => v.name !== varName);
    updateMutation.mutate({ templateId, householdId, memberId, variables: updatedVars });
    if (deleteAlsoFromTexts) {
      const updates: { itemId: number; name?: string; description?: string | null }[] = [];
      for (const item of taskItems as any[]) {
        const newName = removeVarFromText(item.name ?? "", varName).trim();
        const newDesc = item.description
          ? removeVarFromText(item.description, varName).trim() || null
          : item.description;
        if (newName !== item.name || newDesc !== item.description) {
          updates.push({
            itemId: item.id,
            ...(newName !== item.name ? { name: newName || item.name } : {}),
            ...(newDesc !== item.description ? { description: newDesc } : {}),
          });
        }
      }
      if (updates.length > 0) bulkUpdateMutation.mutate({ updates });
    }
    setDeleteCandidate(null);
    toast.success(t("variables.deleted", { name: varName }));
  };

  // Wenn neue Variablen erkannt werden, automatisch speichern
  useEffect(() => {
    if (!template || !enableVariables) return;
    const hasNew = Array.from(allVarNames).some(n => !savedVariables.find(v => v.name === n));
    if (hasNew) {
      updateMutation.mutate({ templateId, householdId, memberId, variables: mergedVars });
    }
  }, [(taskItems as any[]).length, enableVariables]);

  const mentionCount = deleteCandidate ? countMentions(deleteCandidate) : 0;
  const evaluatedVars = evaluateAllVars(mergedVars);
  const rawVarMap = buildVarValueMap(mergedVars);
  const varAssignments = extractVarAssignmentsFromTasks(taskItems as any[], rawVarMap);
  const aliasMap = buildAliasMap(mergedVars);

  // Bereichs-Hinweise aus Aufgaben extrahieren
  const rangeHints = extractRangeHintsFromTasks(taskItems as any[]);

  // Einheits-Hinweise aus Aufgaben extrahieren
  const unitHints = extractUnitHintsFromTasks(taskItems as any[]);

  // Einheits-Vorschlag-Dialog State
  const [unitProposals, setUnitProposals] = useState<Array<{varName: string; hint: UnitHint}>>([]);
  const [showUnitDialog, setShowUnitDialog] = useState(false);

  // Auto-Zuweisung
  useEffect(() => {
    if (!enableVariables || !template) return;
    let changed = false;
    const updated = mergedVars.map(v => {
      if (v.value) return v;
      const assignments = varAssignments[v.name];
      if (!assignments || assignments.length === 0) return v;
      for (const a of assignments) {
        if (a.result?.ok) {
          changed = true;
          return { ...v, value: a.result.display };
        }
      }
      return v;
    });
    if (changed) {
      updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawVarMap), enableVariables]);

  // Bereichs-Vorschläge prüfen (wenn neue Hinweise gefunden werden die noch nicht gesetzt sind)
  useEffect(() => {
    if (!enableVariables || !template) return;
    const proposals: Array<{varName: string; hint: RangeHint}> = [];
    for (const [varName, hints] of Object.entries(rangeHints)) {
      const v = mergedVars.find(mv => mv.name === varName);
      if (!v) continue;
      for (const hint of hints) {
        const minNew = hint.min !== undefined && hint.min !== v.min;
        const maxNew = hint.max !== undefined && hint.max !== v.max;
        if (minNew || maxNew) {
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

  /** Berechnet den numerischen Min/Max-Wert (löst VAR-Referenzen auf) */
  const resolveNumeric = (expr: string | undefined): number | undefined => {
    if (!expr) return undefined;
    const num = parseFloat(expr);
    if (!isNaN(num)) return num;
    // VAR-Referenz auflösen
    const result = evaluateFormula(expr, rawVarMap);
    return result.ok ? result.value : undefined;
  };

  /** Rendert eine einzelne Variablen-Karte */
  const renderVarCard = (v: PlanVariable) => {
    const ev = evaluatedVars[v.name];
    const res = ev?.result;
    const propagatedUnit = res?.ok ? res.unit : undefined;
    const displayUnit = v.unit ?? propagatedUnit;
    // Einheits-Mismatch: manuelle Einheit weicht von propagierter ab
    const unitMismatch = v.unit && propagatedUnit && v.unit !== propagatedUnit;
    // Einheits-Hinweis aus Aufgabentexten (für alle Variablen-Typen)
    const unitHint = unitHints[v.name]?.[0];
    const hasNewUnit = unitHint && unitHint.unit !== v.unit;
    const mentions = countMentions(v.name);
    const isInput = !isComputedVar(v);
    const hasRange = isInput && (v.min !== undefined || v.max !== undefined);
    const minNum = resolveNumeric(v.min);
    const maxNum = resolveNumeric(v.max);
    const currentNum = v.value ? parseFloat(v.value) : undefined;
    const hasSlider = isInput && !v.locked && minNum !== undefined && maxNum !== undefined && minNum < maxNum;
    const rangeHint = rangeHints[v.name]?.[0];
    const hasNewRange = rangeHint && (rangeHint.min !== v.min || rangeHint.max !== v.max);

    return (
      <div key={v.name} className="rounded-md border border-border bg-muted/30 p-2.5">
        {editingVar === v.name ? (
          /* ── Bearbeitungs-Modus ── */
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editColor}
                onChange={e => setEditColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 flex-shrink-0"
              />
              <span className="text-sm font-mono font-medium break-all flex-1" style={{ color: editColor }}>
                VAR{v.name}
              </span>
            </div>
            {/* Alias */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{t("variables.aliasLabel")}:</span>
              <Input
                placeholder="&KurzName"
                value={editAlias}
                onChange={e => setEditAlias(e.target.value.replace(/^&/, ""))}
                className="h-7 text-xs flex-1"
              />
            </div>
            {/* Wert + Einheit */}
            <div className="flex gap-1.5">
              <Input
                placeholder={t("variables.valuePlaceholder")}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="h-7 text-xs flex-1 min-w-0"
              />
              <Input
                placeholder={t("variables.unitPlaceholder")}
                value={editUnit}
                onChange={e => setEditUnit(e.target.value)}
                className="h-7 text-xs w-16 flex-shrink-0"
              />
            </div>
            {/* Min / Max (nur für Eingabe-Variablen) */}
            {isInput && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{t("variables.rangeLabel")}:</span>
                <Input
                  placeholder={t("variables.minPlaceholder")}
                  value={editMin}
                  onChange={e => setEditMin(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  placeholder={t("variables.maxPlaceholder")}
                  value={editMax}
                  onChange={e => setEditMax(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
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
                <span
                  className="text-sm font-mono font-medium break-all leading-tight"
                  style={{ color: v.color }}
                >
                  VAR{v.name}
                </span>
                {v.alias && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                    <Link2 className="w-2.5 h-2.5 inline mr-0.5" />&{v.alias}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {mentions}×
                </span>
                {/* Schloss-Button */}
                <button
                  type="button"
                  className={`p-0.5 transition-colors ${v.locked ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => toggleLock(v.name)}
                  title={v.locked ? t("variables.unlock") : t("variables.lock")}
                >
                  {v.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  onClick={() => startEdit(v)}
                  title={t("variables.editLabel")}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  onClick={() => { setDeleteCandidate(v.name); setDeleteAlsoFromTexts(false); }}
                  title={t("variables.deleteLabel")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Zeile 2: Wert / Definition */}
            <div className="text-xs text-muted-foreground">
              {v.value ? (
                <div className="flex flex-wrap items-center gap-1">
                  {!isComputedVar(v) && !v.locked ? (
                    /* Eingabe-Variable: editierbares Feld */
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
                      <span
                        className="text-amber-500 cursor-help inline-flex items-center gap-0.5"
                        title={
                          res.error === "missing_vars"
                            ? t("variables.errorMissing", { vars: res.missing?.join(", ") })
                            : res.error === "cycle" ? t("variables.errorCycle")
                            : res.error === "div_zero" ? t("variables.errorDivZero")
                            : t("variables.errorParse")
                        }
                      >
                        → <span className="underline decoration-dotted">?</span>
                        <span className="text-[10px] opacity-70">({
                          res.error === "missing_vars"
                            ? `fehlt: ${res.missing?.slice(0, 2).join(", ")}${(res.missing?.length ?? 0) > 2 ? "…" : ""}`
                            : res.error === "cycle" ? "Zyklus"
                            : res.error === "div_zero" ? "÷0" : "Syntax"
                        })</span>
                      </span>
                    )
                  ) : null}
                  {displayUnit && !isComputedVar(v) && (
                    <span className="text-muted-foreground">{displayUnit}</span>
                  )}
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

            {/* Zeile 3: Schieberegler (nur Eingabe-Variablen, entsperrt, mit Range) */}
            {hasSlider && (() => {
              const range = maxNum! - minNum!;
              // Intelligente Schrittweite basierend auf dem Abstand
              const step = range <= 2 ? 0.01
                : range <= 5 ? 0.05
                : range <= 10 ? 0.1
                : range <= 20 ? 0.25
                : range <= 50 ? 0.5
                : range <= 200 ? 1
                : range <= 1000 ? 5
                : Math.round(range / 200);
              const draft = sliderDrafts[v.name];
              const displayVal = draft !== undefined ? draft : (currentNum ?? minNum!);
              const hasDraft = draft !== undefined && draft !== currentNum;
              const formatVal = (n: number) => {
                // Keine unnötigen Dezimalstellen
                return step < 1 ? n.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(n));
              };
              return (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-10 text-right flex-shrink-0 font-mono">
                      {formatVal(minNum!)}
                    </span>
                    <input
                      type="range"
                      min={minNum}
                      max={maxNum}
                      step={step}
                      value={displayVal}
                      onChange={e => setSliderDrafts(d => ({ ...d, [v.name]: parseFloat(e.target.value) }))}
                      className="flex-1 h-3 accent-violet-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-muted-foreground w-10 flex-shrink-0 font-mono">
                      {formatVal(maxNum!)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {hasDraft ? (
                      <>
                        <span className="text-xs font-mono text-muted-foreground line-through">
                          {currentNum !== undefined ? formatVal(currentNum) : "–"}{displayUnit ? ` ${displayUnit}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs font-mono font-semibold text-emerald-600">
                          {formatVal(draft)}{displayUnit ? ` ${displayUnit}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateValue(v.name, String(draft));
                            setSliderDrafts(d => { const n = {...d}; delete n[v.name]; return n; });
                          }}
                          className="ml-1 px-2 py-0.5 rounded text-xs bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                        >
                          {t("variables.save")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSliderDrafts(d => { const n = {...d}; delete n[v.name]; return n; })}
                          className="px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground border border-border"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-violet-600">
                        {formatVal(displayVal)}{displayUnit ? ` ${displayUnit}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bereichs-Hinweis aus Aufgabentexten */}
            {hasNewRange && rangeHint && (
              <button
                type="button"
                className="text-[11px] text-blue-500 hover:text-blue-600 underline decoration-dotted"
                onClick={() => {
                  setRangeProposals([{ varName: v.name, hint: rangeHint }]);
                  setShowRangeDialog(true);
                }}
              >
                {t("variables.rangeFoundInText", { min: rangeHint.min, max: rangeHint.max })}
              </button>
            )}

            {/* Einheits-Mismatch-Warnung: manuelle Einheit weicht von propagierter ab */}
            {unitMismatch && (
              <div
                className="flex items-center gap-1 text-[11px] text-amber-600 cursor-help"
                title={`Manuelle Einheit "${v.unit}" weicht von berechneter Einheit "${propagatedUnit}" ab`}
              >
                <span>⚠</span>
                <span>{t("variables.unitMismatch", { manual: v.unit, computed: propagatedUnit })}</span>
              </div>
            )}

            {/* Einheits-Vorschlag aus Aufgabentexten (für alle Variablen-Typen) */}
            {hasNewUnit && unitHint && (
              <button
                type="button"
                className="text-[11px] text-emerald-600 hover:text-emerald-700 underline decoration-dotted"
                onClick={() => {
                  setUnitProposals([{ varName: v.name, hint: unitHint }]);
                  setShowUnitDialog(true);
                }}
              >
                {t("variables.unitFoundInText", { unit: unitHint.unit })}
              </button>
            )}

            {/* Variablen-Matrix */}
            {varAssignments[v.name] && varAssignments[v.name].length > 1 && (
              <div className="mt-1 border-l-2 pl-2" style={{ borderColor: v.color }}>
                <p className="text-xs text-muted-foreground mb-1">{t("variables.matrixHint")}</p>
                <div className="space-y-0.5">
                  {varAssignments[v.name].map((a: any, idx: number) => (
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Schalter */}
      <button
        type="button"
        onClick={toggleVariables}
        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
          enableVariables ? "text-violet-600" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Variable className="w-4 h-4" />
        <span>{t("variables.toggle")}</span>
        <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
          enableVariables ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
        }`}>
          {enableVariables ? t("variables.on") : t("variables.off")}
        </span>
      </button>

      {/* Variablen-Liste */}
      {enableVariables && (
        <div className="mt-2 space-y-1">
          {mergedVars.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t("variables.noVars")}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">{t("variables.hint")}</p>

              {/* Eingabe-Variablen */}
              {pureInputVars.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Keyboard className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-blue-600">
                      {t("variables.categoryInput", { count: pureInputVars.length })}
                    </span>
                  </div>
                  {pureInputVars.map(v => renderVarCard(v))}
                </div>
              )}

              {/* Abhängige Eingabe-Variablen */}
              {dependentInputVars.length > 0 && (
                <div className="space-y-1 mt-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link2 className="w-3 h-3 text-cyan-500" />
                    <span className="text-xs font-medium text-cyan-600">
                      {t("variables.categoryDependentInput", { count: dependentInputVars.length })}
                    </span>
                  </div>
                  {dependentInputVars.map(v => renderVarCard(v))}
                </div>
              )}

              {/* Rechen-Variablen */}
              {computedVars.length > 0 && (
                <div className="space-y-1 mt-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calculator className="w-3 h-3 text-violet-500" />
                    <span className="text-xs font-medium text-violet-600">
                      {t("variables.categoryComputed", { count: computedVars.length })}
                    </span>
                  </div>
                  {computedVars.map(v => renderVarCard(v))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Bereichs-Vorschlag-Dialog */}
      <AlertDialog open={showRangeDialog} onOpenChange={open => { if (!open) setShowRangeDialog(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.rangeDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("variables.rangeDialogDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {rangeProposals.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono font-medium" style={{ color: mergedVars.find(v => v.name === p.varName)?.color }}>
                  VAR{p.varName}
                </span>
                <span className="text-muted-foreground">
                  {p.hint.min} ≤ x ≤ {p.hint.max}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRangeDialog(false)}>
              {t("variables.rangeDialogIgnore")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const updated = mergedVars.map(v => {
                const proposal = rangeProposals.find(p => p.varName === v.name);
                if (!proposal) return v;
                return {
                  ...v,
                  min: proposal.hint.min ?? v.min,
                  max: proposal.hint.max ?? v.max,
                };
              });
              updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
              setShowRangeDialog(false);
              toast.success(t("variables.rangeApplied"));
            }}>
              {t("variables.rangeDialogApply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lösch-Bestätigungs-Dialog */}
      <AlertDialog open={deleteCandidate !== null} onOpenChange={open => { if (!open) setDeleteCandidate(null); }}>
      {/* Einheits-Vorschlag-Dialog */}
      <AlertDialog open={showUnitDialog} onOpenChange={open => { if (!open) setShowUnitDialog(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.unitDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("variables.unitDialogDesc")}
            </AlertDialogDescription>
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
              updateMutation.mutate({ templateId, householdId, memberId, variables: updated });
              setShowUnitDialog(false);
              toast.success(t("variables.unitApplied"));
            }}>
              {t("variables.unitDialogApply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {mentionCount > 0
                ? t("variables.deleteDescWithMentions", { name: deleteCandidate, count: mentionCount })
                : t("variables.deleteDesc", { name: deleteCandidate })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mentionCount > 0 && (
            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="deleteFromTexts"
                checked={deleteAlsoFromTexts}
                onChange={e => setDeleteAlsoFromTexts(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="deleteFromTexts" className="text-sm cursor-pointer">
                {t("variables.deleteAlsoFromTexts", { name: deleteCandidate })}
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("variables.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCandidate && confirmDelete(deleteCandidate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("variables.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

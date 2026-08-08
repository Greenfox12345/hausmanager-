/**
 * PlansackVariablesPanel – Variablen-Bearbeitung für Plansack-Snapshots.
 * Arbeitet direkt auf dem lokalen Draft-State (kein tRPC-Backend).
 * Gleiche Logik wie PlanVariablesPanel, aber snapshot-basiert.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Variable, Check, X, Trash2, Calculator, Keyboard, Lock, Unlock, Link2, Plus } from "lucide-react";
import {
  extractVarNames,
  generateVarColor,
  countVarMentions,
  removeVarFromText,
  type PlanVariable,
  type RangeHint,
  evaluateAllVars,
  extractRangeHintsFromTasks,
  topoSortVars,
} from "@/lib/varParser";
import { extractUnitHintsFromTasks } from "@/lib/varParser";
import { VarText } from "@/components/VarToken";
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
  const evalDisplay: Record<string, string> = {};
  for (const [name, ev] of Object.entries(evaluatedVarsRaw)) {
    const r = ev.result;
    if (r !== null && r !== undefined && typeof r !== "object") {
      evalDisplay[name] = String(r) + (ev.unit ? ` ${ev.unit}` : "");
    } else if (typeof r === "object" && r !== null && "error" in r) {
      evalDisplay[name] = `? (${(r as any).error})`;
    }
  }

  // Einheits-Hinweise aus Aufgaben
  const taskItemsForHints = taskItems.map(ti => ({ name: ti.name ?? "", description: ti.description ?? "" }));
  const unitHintsRaw = extractUnitHintsFromTasks(taskItemsForHints);
  const unitHints: Record<string, string> = {};
  for (const [name, hints] of Object.entries(unitHintsRaw)) {
    if (hints.length > 0 && hints[0].unit) unitHints[name] = hints[0].unit;
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
  const [sliderDrafts, setSliderDrafts] = useState<Record<string, number>>({});
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deleteAlsoFromTexts, setDeleteAlsoFromTexts] = useState(false);
  const [rangeProposals, setRangeProposals] = useState<Array<{ varName: string; hint: RangeHint }>>([]);
  const [showRangeDialog, setShowRangeDialog] = useState(false);

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

  const confirmDelete = (varName: string, alsoFromTexts: boolean) => {
    const updatedVars = mergedVars.filter(v => v.name !== varName);
    // Wenn auch aus Texten löschen, dann aus shoppingItems und taskItems entfernen
    // (wird über onChange weitergegeben – der PlansackEditor muss das verarbeiten)
    onChange(updatedVars, enableVariables);
    setDeleteCandidate(null);
  };

  const toggleVariables = () => {
    onChange(mergedVars, !enableVariables);
  };

  // Schieberegler-Schritt berechnen
  const calcStep = (min: number, max: number): number => {
    const range = max - min;
    if (range <= 2) return 0.01;
    if (range <= 5) return 0.05;
    if (range <= 10) return 0.1;
    if (range <= 20) return 0.25;
    if (range <= 50) return 0.5;
    if (range <= 200) return 1;
    if (range <= 1000) return 5;
    return 10;
  };

  // Numerischen Wert einer Variable auflösen (für Slider-Grenzen)
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
    const mentions = countMentions(v.name);
    const isInput = !isComputedVar(v) && !isDependentInputVar(v);
    const minNum = resolveNumeric(v.min);
    const maxNum = resolveNumeric(v.max);
    const currentNum = v.value ? parseFloat(v.value) : undefined;
    const hasSlider = isInput && !v.locked && minNum !== undefined && maxNum !== undefined && minNum < maxNum;
    const rangeHint = rangeHints[v.name]?.[0];
    const hasNewRange = rangeHint && (rangeHint.min !== v.min || rangeHint.max !== v.max);
    const unitHint: string | undefined = unitHints[v.name];
    const hasUnitHint = unitHint !== undefined && unitHint !== v.unit;
    const evalResult: string | undefined = evalDisplay[v.name];

    return (
      <div key={v.name} className="rounded-md border border-border bg-muted/30 p-2.5">
        {editingVar === v.name ? (
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
          <div className="space-y-1.5">
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
                <button type="button" className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => startEdit(v)} title={t("variables.edit")}>
                  <Variable className="w-3 h-3" />
                </button>
                <button type="button" className="text-destructive hover:text-destructive/80 p-0.5" onClick={() => setDeleteCandidate(v.name)} title={t("variables.delete")}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {/* Wert-Anzeige */}
            {v.value !== undefined && (
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">= {v.value}</span>
                {evalResult !== undefined && evalResult !== v.value && (
                  <span className="ml-1 font-semibold text-foreground">→ {evalResult}</span>
                )}
              </div>
            )}
            {/* Einheit */}
            {v.unit && <span className="text-xs text-muted-foreground">[{v.unit}]{hasUnitHint && <span className="ml-1 text-amber-500" title={`Vorschlag: ${unitHint}`}>⚠</span>}</span>}
            {/* Bereichs-Vorschlag */}
            {hasNewRange && (
              <button type="button" className="text-xs text-blue-600 hover:text-blue-800 underline" onClick={() => { setRangeProposals([{ varName: v.name, hint: rangeHint! }]); setShowRangeDialog(true); }}>
                📏 {t("variables.rangeProposal", "Bereich übernehmen")}
              </button>
            )}
            {/* Einheits-Vorschlag */}
            {hasUnitHint && unitHint && (
              <button type="button" className="text-xs text-green-600 hover:text-green-800 underline ml-2" onClick={() => { const updated = mergedVars.map(vv => vv.name === v.name ? { ...vv, unit: unitHint } : vv); onChange(updated, enableVariables); }}>
                📐 {unitHint}
              </button>
            )}
            {/* Schieberegler */}
            {hasSlider && (
              <div className="pt-1">
                <input
                  type="range"
                  min={minNum}
                  max={maxNum}
                  step={calcStep(minNum!, maxNum!)}
                  value={sliderDrafts[v.name] ?? (currentNum ?? minNum)}
                  onChange={e => setSliderDrafts(prev => ({ ...prev, [v.name]: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 accent-violet-600"
                />
                {sliderDrafts[v.name] !== undefined && sliderDrafts[v.name] !== currentNum && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs line-through text-muted-foreground">{currentNum ?? "?"}</span>
                    <span className="text-xs font-semibold text-green-600">{sliderDrafts[v.name]}</span>
                    <Button size="sm" className="h-6 px-2 text-xs" onClick={() => { updateValue(v.name, String(sliderDrafts[v.name])); setSliderDrafts(prev => { const n = { ...prev }; delete n[v.name]; return n; }); }}>
                      <Check className="w-3 h-3 mr-1" />{t("variables.save")}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSliderDrafts(prev => { const n = { ...prev }; delete n[v.name]; return n; })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            {/* Eingabe-Feld wenn nicht gesperrt */}
            {isInput && !v.locked && !hasSlider && (
              <div className="flex gap-1.5 mt-1">
                <Input
                  value={v.value ?? ""}
                  onChange={e => updateValue(v.name, e.target.value)}
                  placeholder={t("variables.valuePlaceholder")}
                  className="h-7 text-xs flex-1"
                />
                {v.unit && <span className="text-xs text-muted-foreground self-center">{v.unit}</span>}
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

      {/* Lösch-Dialog */}
      <AlertDialog open={deleteCandidate !== null} onOpenChange={open => { if (!open) setDeleteCandidate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate && t("variables.deleteDesc", { varName: deleteCandidate, count: countMentions(deleteCandidate) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-4 pb-2">
            <input type="checkbox" id="deleteFromTexts" checked={deleteAlsoFromTexts} onChange={e => setDeleteAlsoFromTexts(e.target.checked)} />
            <label htmlFor="deleteFromTexts" className="text-sm">{t("variables.deleteFromTexts")}</label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("variables.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCandidate && confirmDelete(deleteCandidate, deleteAlsoFromTexts)}>
              <Trash2 className="w-4 h-4 mr-2" />{t("variables.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bereichs-Vorschlag-Dialog */}
      <AlertDialog open={showRangeDialog} onOpenChange={setShowRangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("variables.rangeProposalTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {rangeProposals.map(p => (
                <span key={p.varName} className="block">VAR{p.varName}: {p.hint.min} – {p.hint.max}</span>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRangeDialog(false)}>{t("variables.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const updated = mergedVars.map(v => {
                const proposal = rangeProposals.find(p => p.varName === v.name);
                if (!proposal) return v;
                return { ...v, min: proposal.hint.min, max: proposal.hint.max };
              });
              onChange(updated, enableVariables);
              setShowRangeDialog(false);
            }}>
              {t("variables.rangeProposalAccept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

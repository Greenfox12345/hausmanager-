/**
 * PlanVariablesPanel – Variablen-Schalter und Variablen-Liste für Plankiste-Aufgaben-Vorlagen
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Variable, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  extractVarNames,
  generateVarColor,
  mergeVarsFromText,
  countVarMentions,
  removeVarFromText,
  type PlanVariable,
} from "@/lib/varParser";
import { evaluateAllVars, extractVarAssignmentsFromTasks, buildVarValueMap } from "@/lib/varParser";
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

  // Lösch-Dialog State
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deleteAlsoFromTexts, setDeleteAlsoFromTexts] = useState(false);

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
        ? { ...v, value: editValue || undefined, unit: editUnit || undefined, color: editColor || v.color }
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
  };

  // Variable aus der Liste löschen (und optional aus allen Texten entfernen)
  const confirmDelete = (varName: string) => {
    // Variable aus der gespeicherten Liste entfernen
    const updatedVars = mergedVars.filter(v => v.name !== varName);
    updateMutation.mutate({ templateId, householdId, memberId, variables: updatedVars });

    // Optional: VAR-Token aus allen Aufgaben-Texten entfernen
    if (deleteAlsoFromTexts) {
      const updates: { itemId: number; name?: string; description?: string | null }[] = [];
      for (const item of taskItems as any[]) {
        const newName = removeVarFromText(item.name ?? "", varName).trim();
        const newDesc = item.description
          ? removeVarFromText(item.description, varName).trim() || null
          : item.description;
        const nameChanged = newName !== item.name;
        const descChanged = newDesc !== item.description;
        if (nameChanged || descChanged) {
          updates.push({
            itemId: item.id,
            ...(nameChanged ? { name: newName || item.name } : {}),
            ...(descChanged ? { description: newDesc } : {}),
          });
        }
      }
      if (updates.length > 0) {
        bulkUpdateMutation.mutate({ updates });
      }
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
  // Alle Variablen auswerten (Formel-Engine)
  const evaluatedVars = evaluateAllVars(mergedVars);

  // Variablen-Zuweisungen aus Aufgaben-Texten extrahieren (für Matrix)
  const rawVarMap = buildVarValueMap(mergedVars);
  const varAssignments = extractVarAssignmentsFromTasks(taskItems as any[], rawVarMap);

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
              {mergedVars.map(v => (
                <div key={v.name} className="rounded-md border border-border bg-muted/30 p-2">
                  {editingVar === v.name ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                          title={t("variables.colorLabel")}
                        />
                        <span className="text-sm font-mono font-medium" style={{ color: editColor }}>
                          VAR{v.name}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder={t("variables.valuePlaceholder")}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Input
                          placeholder={t("variables.unitPlaceholder")}
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          className="h-7 text-xs w-16"
                        />
                        <Button size="sm" className="h-7 w-7 p-0" onClick={() => saveVarEdit(v.name)}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingVar(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium flex-shrink-0" style={{ color: v.color }}>
                        VAR{v.name}
                      </span>
                      {/* Erwähnungs-Zähler */}
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {countMentions(v.name)}×
                      </span>
                      {v.value ? (
                        <span className="text-xs text-muted-foreground truncate flex items-center gap-1 flex-wrap">
                          <span className="font-mono">= {v.value}</span>
                          {(() => {
                            const ev = evaluatedVars[v.name];
                            if (!ev) return null;
                            const res = ev.result;
                            if (res.ok) {
                              return <span className="text-emerald-600 font-medium">→ {res.display}{v.unit ? ` ${v.unit}` : ""}</span>;
                            }
                            const errMsg = res.error === "missing_vars"
                              ? t("variables.errorMissing", { vars: res.missing?.join(", ") })
                              : res.error === "cycle"
                              ? t("variables.errorCycle")
                              : res.error === "div_zero"
                              ? t("variables.errorDivZero")
                              : t("variables.errorParse");
                            return <span className="text-amber-500 cursor-help" title={errMsg}>→ ?</span>;
                          })()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic truncate">
                          {t("variables.noValue")}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(v)}
                          title={t("variables.editLabel")}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => { setDeleteCandidate(v.name); setDeleteAlsoFromTexts(false); }}
                          title={t("variables.deleteLabel")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Variablen-Matrix: wenn Variable in mehreren Aufgaben zugewiesen wird */}
                  {varAssignments[v.name] && varAssignments[v.name].length > 1 && (
                    <div className="mt-1 ml-1 border-l-2 pl-2" style={{ borderColor: v.color }}>
                      <p className="text-xs text-muted-foreground mb-1">{t("variables.matrixHint")}</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {varAssignments[v.name].map((a: any, idx: number) => (
                            <tr key={idx} className="border-b border-border/50 last:border-0">
                              <td className="py-0.5 pr-2 text-muted-foreground truncate max-w-[120px]">{a.taskName}</td>
                              <td className="py-0.5 font-mono">{a.formula}</td>
                              <td className="py-0.5 pl-2 text-right">
                                {a.result?.ok
                                  ? <span className="text-emerald-600">{a.result.display}{v.unit ? ` ${v.unit}` : ""}</span>
                                  : <span className="text-amber-500">?</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Lösch-Bestätigungs-Dialog */}
      <AlertDialog open={deleteCandidate !== null} onOpenChange={open => { if (!open) setDeleteCandidate(null); }}>
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

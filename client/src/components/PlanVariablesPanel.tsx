/**
 * PlanVariablesPanel – Variablen-Schalter und Variablen-Liste für Plankiste-Aufgaben-Vorlagen
 *
 * Zeigt:
 * - Einen Toggle-Schalter "Variablen aktivieren"
 * - Wenn aktiv: Liste aller erkannten VAR-Variablen aus allen Aufgaben
 * - Für jede Variable: Name (farbig), Wert/Formel, Einheit, Farb-Picker
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Variable, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import {
  extractVarNames,
  generateVarColor,
  mergeVarsFromText,
  type PlanVariable,
} from "@/lib/varParser";
import { useTranslation } from "react-i18next";

interface PlanVariablesPanelProps {
  templateId: number;
  householdId: number;
  memberId: number;
}

export function PlanVariablesPanel({ templateId, householdId, memberId }: PlanVariablesPanelProps) {
  const { t } = useTranslation("plankiste");
  const utils = trpc.useUtils();

  // Vorlage laden (enthält enableVariables und variables)
  const { data: template } = trpc.planTemplates.getTemplate.useQuery(
    { templateId },
    { enabled: templateId > 0 }
  );

  // Alle Aufgaben laden um VAR-Namen zu extrahieren
  const { data: taskItems = [] } = trpc.planTemplates.listTemplateTaskItems.useQuery(
    { templateId },
    { enabled: templateId > 0 }
  );

  const updateMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
      utils.planTemplates.listTemplates.invalidate({ householdId });
    },
    onError: () => toast.error(t("variables.saveError")),
  });

  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editColor, setEditColor] = useState("");

  const enableVariables = (template as any)?.enableVariables ?? false;
  const savedVariables: PlanVariable[] = (template as any)?.variables ?? [];

  // Alle VAR-Namen aus allen Aufgaben extrahieren
  const allVarNames = new Set<string>();
  for (const item of taskItems as any[]) {
    extractVarNames(item.name ?? "").forEach(n => allVarNames.add(n));
    extractVarNames(item.description ?? "").forEach(n => allVarNames.add(n));
  }

  // Gespeicherte Variablen mit neu erkannten mergen
  const mergedVars: PlanVariable[] = [...savedVariables];
  for (const name of Array.from(allVarNames)) {
    if (!mergedVars.find(v => v.name === name)) {
      mergedVars.push({ name, color: generateVarColor(name) });
    }
  }

  const toggleVariables = () => {
    updateMutation.mutate({
      templateId,
      householdId,
      memberId,
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
    updateMutation.mutate({
      templateId, householdId, memberId,
      variables: updated,
    });
    setEditingVar(null);
  };

  const startEdit = (v: PlanVariable) => {
    setEditingVar(v.name);
    setEditValue(v.value ?? "");
    setEditUnit(v.unit ?? "");
    setEditColor(v.color);
  };

  // Wenn neue Variablen erkannt werden, automatisch speichern
  useEffect(() => {
    if (!template || !enableVariables) return;
    const hasNew = Array.from(allVarNames).some(n => !savedVariables.find(v => v.name === n));
    if (hasNew) {
      updateMutation.mutate({
        templateId, householdId, memberId,
        variables: mergedVars,
      });
    }
  }, [taskItems.length, enableVariables]);

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
                    /* Bearbeitungs-Zeile */
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {/* Farbpicker */}
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
                    /* Anzeige-Zeile */
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-mono font-medium flex-shrink-0"
                        style={{ color: v.color }}
                      >
                        VAR{v.name}
                      </span>
                      {v.value ? (
                        <span className="text-xs text-muted-foreground">
                          = {v.value}{v.unit ? ` ${v.unit}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {t("variables.noValue")}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(v)}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

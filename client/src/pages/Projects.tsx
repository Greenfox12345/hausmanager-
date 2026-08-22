import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  FolderKanban, 
  Plus, 
  List, 
  GanttChart,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  Archive,
  Bell,
  Calendar as CalendarIcon,
  Users,
  Globe,
  AlertTriangle,
  Lock,
  Unlock
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { format, isPast } from "date-fns";
import { getDateFnsLocaleSync } from "@/lib/i18n";
import { toast } from "sonner";
import GanttChartView from "@/components/GanttChartView";
import TaskDependencies from "@/components/TaskDependencies";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { DatePickerInput } from "@/components/DatePickerInput";
import { ShoppingCart, CheckSquare, Variable, Play, Layers } from "lucide-react";
import { VarText } from "@/components/VarToken";
import { evaluateFormula, parseVarAssignment, mergeVarsFromText, type PlanVariable } from "@/lib/varParser";
import { canDirectlyManageTask } from "../../../shared/taskPermissions";
import { topoSortTasks } from "@/lib/varParser";
import { analyseProjectVariableAvailability, planTaskKey } from "../../../shared/projectVariableAvailability";

type EditableProjectPhase = {
  id: string;
  name: string;
  color: string;
  order: number;
  status?: "pending" | "active" | "completed";
};

const PROJECT_PHASE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function ProjectPhasesEditor({ phases, onChange, t }: { phases: EditableProjectPhase[]; onChange: (phases: EditableProjectPhase[]) => void; t: any }) {
  const ordered = [...phases].sort((a, b) => a.order - b.order);
  const replace = (next: EditableProjectPhase[]) => onChange(next.map((phase, index) => ({ ...phase, order: index })));
  const addPhase = () => {
    if (ordered.length >= 12) return;
    replace([...ordered, {
      id: `project-phase-${Date.now()}-${ordered.length}`,
      name: t("projects:phases.newName", "Neue Phase"),
      color: PROJECT_PHASE_COLORS[ordered.length % PROJECT_PHASE_COLORS.length],
      order: ordered.length,
      status: "pending",
    }]);
  };
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    replace(next);
  };
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="font-medium">{t("projects:phases.title", "Projektphasen")}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{t("projects:phases.description", "Aufgaben lassen sich einer Phase zuordnen. Nicht gestartete Phasen bleiben zunächst ausgegraut und ihre Aufgaben erscheinen nicht in der Aufgabenliste.")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={addPhase} disabled={ordered.length >= 12}>
          <Plus className="mr-1 h-3.5 w-3.5" />{t("projects:phases.add", "Phase")}
        </Button>
      </div>
      {ordered.length > 0 && <div className="space-y-2">
        {ordered.map((phase, index) => (
          <div key={phase.id} className="grid grid-cols-[28px_minmax(0,1fr)_70px_auto] items-center gap-2 rounded-md border border-amber-200/80 bg-background p-2 dark:border-amber-900">
            <input aria-label={t("projects:phases.color", "Phasenfarbe")} type="color" value={phase.color} onChange={(event) => replace(ordered.map((entry) => entry.id === phase.id ? { ...entry, color: event.target.value } : entry))} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
            <Input aria-label={t("projects:phases.name", "Phasenname")} value={phase.name} onChange={(event) => replace(ordered.map((entry) => entry.id === phase.id ? { ...entry, name: event.target.value } : entry))} className="h-8 text-sm" />
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t("projects:phases.moveUp", "Nach oben")}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === ordered.length - 1} aria-label={t("projects:phases.moveDown", "Nach unten")}>↓</Button>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => replace(ordered.filter((entry) => entry.id !== phase.id))} aria-label={t("common:delete", "Löschen")}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>}
      {ordered.length === 0 && <p className="text-xs text-muted-foreground">{t("projects:phases.empty", "Ohne Phasen bleiben Projektaufgaben wie bisher sofort sichtbar.")}</p>}
    </div>
  );
}

// ─── Plan-Sektion für Projekte aus Plankiste ──────────────────────────────────
function ProjectPlanSection({ projectId, householdId, memberId }: { projectId: number; householdId: number; memberId: number }) {
  const { t } = useTranslation(["plankiste", "common"]);
  const utils = trpc.useUtils();
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeSection, setActiveSection] = useState<"phases" | "variables" | "shopping" | "tasks" | null>(null);
  // Phasen-Auswahl im Start-Dialog
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>([]);
  // Phase-Start-Dialog
  const [phaseStartDialogId, setPhaseStartDialogId] = useState<string | null>(null);
  const [phaseStartDate, setPhaseStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  // Variablen-Bearbeitung während des Projekts
  const [editingVarValues, setEditingVarValues] = useState<Record<string, string>>({});
  const [editingInputScopes, setEditingInputScopes] = useState<Record<string, "fixed" | "runtime">>({});
  const [editingRangeValues, setEditingRangeValues] = useState<Record<string, { min: string; max: string }>>({});
  const [editingFormulaValues, setEditingFormulaValues] = useState<Record<string, string>>({});
  const [editingOverrideValues, setEditingOverrideValues] = useState<Record<string, string>>({});
  const [varEditMode, setVarEditMode] = useState(false);
  const [editingPhases, setEditingPhases] = useState<EditableProjectPhase[]>([]);
  const [phaseEditMode, setPhaseEditMode] = useState(false);

  const { data: project } = trpc.planProjects.getWithPlanData.useQuery({ projectId });
  const { data: currentProjectTasks = [] } = trpc.tasks.list.useQuery(
    { householdId }, { enabled: householdId > 0 },
  );
  const startMutation = trpc.planProjects.startProject.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("plankiste:project.started", "Projekt gestartet!")} ${data.createdTaskIds.length} Aufgaben, ${data.createdShoppingIds.length} Einkaufsartikel.`);
      utils.planProjects.getWithPlanData.invalidate({ projectId });
      utils.tasks.list.invalidate();
      setStartDialogOpen(false);
    },
    onError: () => toast.error(t("plankiste:project.startError", "Fehler beim Starten")),
  });
  const startPhaseMutation = trpc.planProjects.startPhase.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("plankiste:project.phaseStarted", "Phase gestartet!")} ${data.createdTaskIds.length} Aufgaben, ${data.createdShoppingIds.length} Einkaufsartikel.`);
      utils.planProjects.getWithPlanData.invalidate({ projectId });
      utils.tasks.list.invalidate();
      setPhaseStartDialogId(null);
    },
    onError: () => toast.error(t("plankiste:project.startError", "Fehler beim Starten")),
  });
  const activateExistingPhaseMutation = trpc.planProjects.activateExistingPhase.useMutation({
    onSuccess: () => {
      toast.success(t("plankiste:project.phaseStarted", "Phase gestartet!"));
      utils.planProjects.getWithPlanData.invalidate({ projectId });
      utils.planProjects.getTaskGroupingData.invalidate();
      utils.projects.list.invalidate({ householdId });
      utils.tasks.list.invalidate();
    },
    onError: () => toast.error(t("plankiste:project.startError", "Fehler beim Starten")),
  });
  const updatePlanDataMutation = trpc.planProjects.updatePlanData.useMutation({
    onSuccess: () => {
      toast.success(t("plankiste:project.varsSaved", "Variablen gespeichert"));
      utils.planProjects.getWithPlanData.invalidate({ projectId });
      setVarEditMode(false);
      setPhaseEditMode(false);
    },
    onError: () => toast.error(t("plankiste:project.startError", "Fehler beim Speichern")),
  });

  const storedVariables = ((project as any)?.planVariables ?? []) as PlanVariable[];
  const storedPlanTasks = ((project as any)?.planTaskItems ?? []) as Array<{ name?: string; description?: string | null }>;
  const projectTasksForRecognition = currentProjectTasks.filter((task: any) => task.projectIds?.includes(projectId));
  const recognizedProjectVariables = useMemo(() => {
    let merged = storedVariables;
    const sourceItems = [...storedPlanTasks, ...projectTasksForRecognition];
    for (const item of sourceItems) {
      merged = mergeVarsFromText(`${item.name ?? ""} ${item.description ?? ""}`, merged);
      const assignments = String(item.description ?? "").split(/[;\n]/)
        .map((line) => parseVarAssignment(line.trim()))
        .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment));
      if (assignments.length > 0) {
        merged = merged.map((variable) => {
          const assignment = assignments.find((entry) => entry.varName === variable.name);
          return assignment && !variable.value ? { ...variable, value: assignment.formula } : variable;
        });
      }
    }
    return merged;
  }, [storedVariables, storedPlanTasks, projectTasksForRecognition]);

  useEffect(() => {
    if (!project || !project.enableVariables) return;
    if (JSON.stringify(recognizedProjectVariables) === JSON.stringify(storedVariables)) return;
    updatePlanDataMutation.mutate({ projectId, planVariables: recognizedProjectVariables });
  // Die Variablenliste wird nur bei einer echten Text-/Strukturänderung zurückgeschrieben.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.enableVariables, JSON.stringify(recognizedProjectVariables), JSON.stringify(storedVariables)]);

  if (!project) return null;

  const phases = (project.planPhases ?? []) as Array<{ id: string; name: string; color: string; order: number; status?: string }>;
  const variables = recognizedProjectVariables;
  const shoppingItemsList = (project.planShoppingItems ?? []) as Array<{ name: string; quantity?: string; notes?: string; phaseId?: string }>;
  const taskItemsList = (project.planTaskItems ?? []) as Array<{ name: string; description?: string; phaseId?: string; daysOffset?: number }>;
  const enableVariables = project.enableVariables ?? false;
  const isActive = project.status !== "planning";
  const getPhase = (id?: string | null) => phases.find(p => p.id === id);
  const startPhaseEdit = () => {
    setEditingPhases(phases.map((phase) => ({ ...phase, status: phase.status as EditableProjectPhase["status"] })));
    setPhaseEditMode(true);
  };
  const savePhaseEdit = () => {
    const retainedPhaseIds = new Set(editingPhases.map((phase) => phase.id));
    updatePlanDataMutation.mutate({
      projectId,
      planPhases: editingPhases,
      planTaskItems: taskItemsList.map((item) => item.phaseId && !retainedPhaseIds.has(item.phaseId) ? { ...item, phaseId: undefined } : item),
      planShoppingItems: shoppingItemsList.map((item) => item.phaseId && !retainedPhaseIds.has(item.phaseId) ? { ...item, phaseId: undefined } : item),
    });
  };

  const getVariableFormula = (v: PlanVariable) => {
    const assignment = v.description ? parseVarAssignment(v.description) : null;
    return assignment?.varName === v.name ? assignment.formula : v.value;
  };
  const isInputVar = (v: PlanVariable) => {
    const assignment = v.description ? parseVarAssignment(v.description) : null;
    return !assignment && !/VAR[A-Za-zÄÖÜäöüß]/.test(v.value ?? "");
  };
  const formulaVariableMap = Object.fromEntries(variables.flatMap((v) => {
    const formula = getVariableFormula(v);
    return formula ? [[v.name, formula]] : [];
  }));
  const effectiveVariableMap = Object.fromEntries(variables.flatMap((v) => {
    const formula = v.overrideValue || getVariableFormula(v);
    return formula ? [[v.name, formula]] : [];
  }));
  const unitMap = Object.fromEntries(variables.flatMap((v) => v.unit ? [[v.name, v.unit]] : []));
  const calculatedVariables = variables.map((v) => {
    const formula = v.overrideValue || getVariableFormula(v);
    if (!formula) return v;
    const result = evaluateFormula(formula, effectiveVariableMap, v.name, unitMap);
    return result.ok ? { ...v, value: result.display, unit: v.unit ?? result.unit } : v;
  });
  const calculatedByName = Object.fromEntries(calculatedVariables.map((v) => [v.name, v]));
  const formulaResults = Object.fromEntries(variables.map((v) => {
    const formula = getVariableFormula(v);
    const result = formula ? evaluateFormula(formula, formulaVariableMap, v.name, unitMap) : null;
    return [v.name, result];
  }));
  const allInputVars = variables.filter(v => isInputVar(v));

  // Variablen die in einer Phase verwendet werden (alle, nicht nur ohne Wert)
  const getInputVarsForPhase = (phaseId: string | null): PlanVariable[] => {
    if (!enableVariables) return [];
    const phaseItems = phaseId
      ? [...taskItemsList.filter(t => (t as any).phaseId === phaseId), ...shoppingItemsList.filter(s => (s as any).phaseId === phaseId)]
      : [...taskItemsList.filter(t => !(t as any).phaseId), ...shoppingItemsList.filter(s => !(s as any).phaseId)];
    const usedVarNames = new Set<string>();
    for (const item of phaseItems) {
      const texts = [item.name, (item as any).description, (item as any).quantity, (item as any).notes].filter(Boolean);
      for (const text of texts) {
        const matches = (text as string).match(/VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g) ?? [];
        for (const m of matches) usedVarNames.add(m.slice(3));
      }
    }
    // Alle Eingabe-Variablen die in dieser Phase vorkommen
    return variables.filter(v => usedVarNames.has(v.name) && isInputVar(v));
  };

  // Beim Öffnen des Start-Dialogs wird nur die erste Phase vorausgewählt.
  // Ihre Eingabevariablen werden danach über die ersten passenden Aufgaben erfasst.
  const openStartDialog = () => {
    const firstPhaseId = [...phases].sort((a, b) => a.order - b.order)[0]?.id;
    setSelectedPhaseIds(firstPhaseId ? [firstPhaseId] : []);
    setStartDialogOpen(true);
  };

  // Beim Öffnen des Phase-Start-Dialogs
  const openPhaseStartDialog = (phaseId: string) => {
    setPhaseStartDate(new Date().toISOString().split("T")[0]);
    setPhaseStartDialogId(phaseId);
  };

  // Variablen-Bearbeitung starten
  const startVarEdit = () => {
    const vals: Record<string, string> = {};
    const scopes: Record<string, "fixed" | "runtime"> = {};
    const ranges: Record<string, { min: string; max: string }> = {};
    const formulas: Record<string, string> = {};
    const overrides: Record<string, string> = {};
    for (const v of allInputVars) {
      if (v.value) vals[v.name] = v.value;
      scopes[v.name] = v.inputScope === "runtime" ? "runtime" : "fixed";
      ranges[v.name] = { min: v.min === undefined ? "" : String(v.min), max: v.max === undefined ? "" : String(v.max) };
    }
    for (const v of variables.filter((item) => !isInputVar(item))) {
      const formula = getVariableFormula(v);
      if (formula) formulas[v.name] = formula;
      if (v.overrideValue) overrides[v.name] = v.overrideValue;
    }
    setEditingVarValues(vals);
    setEditingInputScopes(scopes);
    setEditingRangeValues(ranges);
    setEditingFormulaValues(formulas);
    setEditingOverrideValues(overrides);
    setVarEditMode(true);
  };

  // Variablen speichern
  const saveVarEdit = () => {
    const updatedVars = variables.map(v => {
      if (isInputVar(v) && editingVarValues[v.name] !== undefined) {
        return { ...v, value: editingVarValues[v.name] || undefined, inputScope: editingInputScopes[v.name] ?? "fixed", min: editingRangeValues[v.name]?.min.trim() || undefined, max: editingRangeValues[v.name]?.max.trim() || undefined };
      }
      if (isInputVar(v)) return { ...v, inputScope: editingInputScopes[v.name] ?? "fixed", min: editingRangeValues[v.name]?.min.trim() || undefined, max: editingRangeValues[v.name]?.max.trim() || undefined };
      if (!isInputVar(v)) {
        const formula = editingFormulaValues[v.name]?.trim();
        return {
          ...v,
          value: undefined,
          description: formula ? `VAR${v.name} = ${formula}` : v.description,
          overrideValue: editingOverrideValues[v.name]?.trim() || undefined,
        };
      }
      return v;
    });
    updatePlanDataMutation.mutate({ projectId, planVariables: updatedVars });
  };

  const toggleVariableLock = (varName: string) => {
    updatePlanDataMutation.mutate({
      projectId,
      planVariables: variables.map((variable) => variable.name === varName ? { ...variable, locked: !variable.locked } : variable),
    });
  };

  // Variablen für ausgewählte Phasen im Start-Dialog (dedupliziert)
  const varsForSelectedPhases = enableVariables
    ? Array.from(new Map(
        selectedPhaseIds.flatMap(pid => getInputVarsForPhase(pid).filter((variable) => variable.inputScope !== "runtime")).map(v => [v.name, v] as [string, PlanVariable])
      ).values())
    : [];

  // Auch phasenlose Variablen hinzufügen
  const phaselessVars = enableVariables ? getInputVarsForPhase(null).filter((variable) => variable.inputScope !== "runtime") : [];
  const allStartVars = Array.from(new Map(
    [...varsForSelectedPhases, ...phaselessVars].map(v => [v.name, v] as [string, PlanVariable])
  ).values());

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
  const variableAvailability = enableVariables
    ? analyseProjectVariableAvailability(variables, phases, taskItemsList, shoppingItemsList)
    : null;
  const getPhaseVariableIssues = (phaseId: string): string[] => {
    if (!variableAvailability) return [];
    const issues = new Set<string>();
    taskItemsList.forEach((task, index) => {
      if ((task as any).phaseId !== phaseId) return;
      const taskKey = planTaskKey(task, index);
      const unresolved = variableAvailability.unresolvedNamesByTaskKey[taskKey] ?? [];
      if (unresolved.length > 0) {
        issues.add(t("plankiste:project.variableAvailability.unresolvedTask", "Die Aufgabe „{{task}}“ enthält nicht auflösbare Variablen: {{variables}}.", { task: task.name, variables: unresolved.join(", ") }));
      }
      for (const inputName of variableAvailability.requiredInputNamesByTaskKey[taskKey] ?? []) {
        if (variableAvailability.availableInputNames.includes(inputName)) continue;
        const sourceKey = variableAvailability.inputTaskKeyByName[inputName];
        const sourcePhaseId = sourceKey ? variableAvailability.taskPhaseIdByKey[sourceKey] : null;
        if (!sourceKey) {
          issues.add(t("plankiste:project.variableAvailability.noInputTask", "Für „{{variable}}“ gibt es keine Aufgabe, in der der Wert erfasst werden kann.", { variable: inputName }));
        } else if (sourcePhaseId && sourcePhaseId !== phaseId) {
          const sourcePhase = phases.find((phase) => phase.id === sourcePhaseId);
          issues.add(t("plankiste:project.variableAvailability.previousPhaseRequired", "„{{variable}}“ muss zuerst in Phase „{{phase}}“ dokumentiert werden.", { variable: inputName, phase: sourcePhase?.name ?? sourcePhaseId }));
        }
      }
    });
    for (const inputName of variableAvailability.unassignableInputsByPhase[phaseId] ?? []) {
      issues.add(t("plankiste:project.variableAvailability.shoppingNeedsValue", "„{{variable}}“ wird für einen Einkaufsartikel benötigt, kann aber keiner Eingabeaufgabe zugeordnet werden.", { variable: inputName }));
    }
    return Array.from(issues);
  };
  const selectedPhaseVariableIssues = Array.from(new Set(selectedPhaseIds.flatMap(getPhaseVariableIssues)));

  // Render-Hilfsfunktion: Variablen-Eingabe-Block
  const renderVarInputs = (
    vars: PlanVariable[],
    values: Record<string, string>,
    setValues: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
    showReset = true,
    scopes?: Record<string, "fixed" | "runtime">,
    setScopes?: (fn: (prev: Record<string, "fixed" | "runtime">) => Record<string, "fixed" | "runtime">) => void,
    ranges?: Record<string, { min: string; max: string }>,
    setRanges?: (fn: (prev: Record<string, { min: string; max: string }>) => Record<string, { min: string; max: string }>) => void,
  ) => (
    <div className="space-y-2">
      {vars.map(v => {
        const min = v.min ? Number(v.min) : NaN;
        const max = v.max ? Number(v.max) : NaN;
        const current = Number(values[v.name] ?? v.value ?? min);
        const hasRange = Number.isFinite(min) && Number.isFinite(max) && min < max;
        return <div key={v.name} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
          <span className="text-xs font-mono flex-shrink-0 min-w-0" style={{ color: v.color }}>
            {v.alias ? `&${v.alias}` : `VAR${v.name}`}
          </span>
          {scopes && setScopes && (
            <select
              value={scopes[v.name] ?? (v.inputScope === "runtime" ? "runtime" : "fixed")}
              onChange={(event) => setScopes((previous) => ({ ...previous, [v.name]: event.target.value as "fixed" | "runtime" }))}
              className="h-7 max-w-36 rounded border border-border bg-background px-1 text-[11px]"
              aria-label={t("plankiste:project.variableScope", "Art der Eingabevariable")}
            >
              <option value="fixed">{t("plankiste:project.variableScopeFixed", "Feste Vorgabe")}</option>
              <option value="runtime">{t("plankiste:project.variableScopeRuntime", "Je Projektdurchlauf")}</option>
            </select>
          )}
          {v.min && v.max && (
            <span className="text-xs text-muted-foreground flex-shrink-0">[{v.min}–{v.max}]</span>
          )}
          <input
            type="number"
            value={values[v.name] ?? ""}
            onChange={e => setValues(prev => ({ ...prev, [v.name]: e.target.value }))}
            disabled={v.locked}
            placeholder={v.description ?? v.name}
            className="flex-1 border border-border rounded px-2 py-1 text-xs bg-background min-w-0"
          />
          {v.unit && <span className="text-xs text-muted-foreground flex-shrink-0">{v.unit}</span>}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleVariableLock(v.name)} title={v.locked ? t("plankiste:variables.unlock", "Eingabe entsperren") : t("plankiste:variables.lock", "Eingabe sperren")}>
            {v.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>
          {showReset && values[v.name] && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
              title={t("common:reset", "Zurücksetzen")}
              onClick={() => setValues(prev => { const n = { ...prev }; delete n[v.name]; return n; })}
            >
              ✕
            </button>
          )}
        </div>
        {hasRange && !v.locked && <input type="range" min={min} max={max} step={(max - min) >= 10 ? 1 : (max - min) >= 1 ? 0.1 : 0.01} value={Number.isFinite(current) ? current : min} onChange={e => setValues(prev => ({ ...prev, [v.name]: e.target.value }))} className="w-full accent-amber-600" />}
        {ranges && setRanges && (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Input value={ranges[v.name]?.min ?? ""} onChange={(event) => setRanges((previous) => ({ ...previous, [v.name]: { min: event.target.value, max: previous[v.name]?.max ?? "" } }))} placeholder={t("plankiste:variables.minPlaceholder", "Untergrenze, z. B. 30 oder VARMin") } className="h-7 text-xs" />
            <Input value={ranges[v.name]?.max ?? ""} onChange={(event) => setRanges((previous) => ({ ...previous, [v.name]: { min: previous[v.name]?.min ?? "", max: event.target.value } }))} placeholder={t("plankiste:variables.maxPlaceholder", "Obergrenze, z. B. 120 oder VARMax") } className="h-7 text-xs" />
          </div>
        )}
        </div>;
      })}
    </div>
  );

  return (
    <Card className="shadow-md border-amber-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            {project.planTemplateId ? t("plankiste:project.planSection", "Plan-Inhalte") : t("plankiste:project.projectStructure", "Projektstruktur")}
          </CardTitle>
          {!isActive && project.planTemplateId ? (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={openStartDialog}>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {t("plankiste:project.startProject", "Projekt starten")}
            </Button>
          ) : project.planTemplateId ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              {t("plankiste:project.alreadyStarted", "Gestartet")}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {project.planTemplateId
            ? t("plankiste:project.planSectionDesc", "Aus Plankiste-Vorlage. Beim Starten werden Aufgaben und Einkäufe übertragen.")
            : t("plankiste:project.projectStructureDesc", "Projektvariablen werden aus den zugeordneten Aufgaben erkannt und können hier gepflegt werden.")}
        </p>
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-muted-foreground dark:border-violet-900 dark:bg-violet-950/20">
          {enableVariables ? (
            <span className="flex items-center gap-1.5 text-violet-950 dark:text-violet-100"><Variable className="h-3.5 w-3.5" />{t("plankiste:project.variablesEnabledHint", "VAR-Namen in Aufgaben und Beschreibungen werden erkannt und aufgelöst.")}</span>
          ) : t("plankiste:project.variablesDisabledHint", "Die Variablennutzung kann beim Erstellen oder Bearbeiten des Projekts aktiviert werden.")}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Phasen-Übersicht mit Status */}
        {phases.length > 0 && (
          <div>
            <button type="button" className="w-full flex items-center justify-between py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setActiveSection(s => s === "phases" ? null : "phases")}>
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> {t("plankiste:phases.title", "Phasen")} ({phases.length})</span>
              <span>{activeSection === "phases" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "phases" && (
              <div className="space-y-1 mt-1 pl-2">
                {!phaseEditMode ? <>
                  <div className="mb-2 flex justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startPhaseEdit}>
                      <Edit2 className="mr-1 h-3 w-3" />{t("projects:phases.edit", "Phasen bearbeiten")}
                    </Button>
                  </div>
                  {sortedPhases.map(phase => (
                    <div key={phase.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border" style={{ borderColor: phase.color, color: phase.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: phase.color }} />
                        {phase.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {phase.status === "active" && <Badge variant="outline" className="text-xs text-green-600 border-green-300">{t("plankiste:project.phaseActive", "Aktiv")}</Badge>}
                        {phase.status === "completed" && <Badge variant="outline" className="text-xs text-gray-500">{t("plankiste:project.phaseCompleted", "Abgeschlossen")}</Badge>}
                        {(isActive || !project.planTemplateId) && (phase.status === "pending" || !phase.status) && (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => project.planTemplateId ? openPhaseStartDialog(phase.id) : activateExistingPhaseMutation.mutate({ projectId, phaseId: phase.id, householdId })} disabled={activateExistingPhaseMutation.isPending}>
                            <Play className="w-2.5 h-2.5 mr-1" />
                            {t("plankiste:project.startPhase", "Starten")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </> : <div className="space-y-2">
                  <ProjectPhasesEditor phases={editingPhases} onChange={setEditingPhases} t={t} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPhaseEditMode(false)}>{t("common:cancel", "Abbrechen")}</Button>
                    <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={savePhaseEdit} disabled={updatePlanDataMutation.isPending}>{t("common:save", "Speichern")}</Button>
                  </div>
                </div>}
              </div>
            )}
          </div>
        )}

        {enableVariables && variables.length === 0 && (
          <p className="rounded-md border border-dashed border-violet-300 bg-violet-50/50 px-3 py-2 text-xs text-violet-950 dark:text-violet-100">
            {t("plankiste:project.noRecognizedVariables", "Noch keine Variablen erkannt. Verwenden Sie zum Beispiel VARBreite in einer Projektaufgabe oder deren Beschreibung.")}
          </p>
        )}

        {/* Variablen-Sektion – editierbar */}
        {enableVariables && variables.length > 0 && (
          <div>
            <button type="button" className="w-full flex items-center justify-between py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setActiveSection(s => s === "variables" ? null : "variables")}>
              <span className="flex items-center gap-2"><Variable className="w-3.5 h-3.5" /> {t("plankiste:variables.title", "Variablen")} ({variables.length})</span>
              <span>{activeSection === "variables" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "variables" && (
              <div className="mt-1 pl-2 space-y-2">
                {!varEditMode ? (
                  <>
                    <div className="space-y-1">
                      {calculatedVariables.map(v => {
                        const source = variables.find((item) => item.name === v.name)!;
                        const formulaResult = formulaResults[v.name];
                        const overrideNumber = Number(source.overrideValue?.replace(",", "."));
                        const hasOverride = !isInputVar(source) && Boolean(source.overrideValue) && formulaResult?.ok && Number.isFinite(overrideNumber) && formulaResult.value !== overrideNumber;
                        return <div key={v.name} className="flex items-start gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
                          <div className="min-w-0">
                            <span className="font-mono" style={{ color: v.color }}>{v.alias ? `&${v.alias}` : `VAR${v.name}`}</span>
                            {isInputVar(source) && (
                              <span className="ml-1 text-[10px] text-muted-foreground">{source.inputScope === "runtime"
                                ? t("plankiste:project.variableScopeRuntime", "Je Projektdurchlauf")
                                : t("plankiste:project.variableScopeFixed", "Feste Vorgabe")}</span>
                            )}
                            {!isInputVar(source) && <span className="ml-1 text-muted-foreground">← {getVariableFormula(source)}</span>}
                            <div className="text-muted-foreground">= {v.value ? `${v.value}${v.unit ? ` ${v.unit}` : ""}` : t("plankiste:project.noValue", "kein Wert")}</div>
                          </div>
                          {hasOverride && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label={t("plankiste:project.variableOverride", "Manuell überschrieben")} />}
                        </div>;
                      })}
                    </div>
                    {allInputVars.length > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startVarEdit}>
                        <Edit2 className="w-3 h-3 mr-1" />
                        {t("plankiste:project.editVars", "Variablen bearbeiten")}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    <p className="text-xs font-medium text-amber-700">{t("plankiste:project.editVarsTitle", "Eingabe-Variablen bearbeiten:")}</p>
                    {renderVarInputs(allInputVars, editingVarValues, setEditingVarValues, true, editingInputScopes, setEditingInputScopes, editingRangeValues, setEditingRangeValues)}
                    {variables.filter((v) => !isInputVar(v)).map((v) => (
                      <div key={v.name} className="border-t border-amber-200 pt-2 space-y-1">
                        <Label className="text-xs font-mono" style={{ color: v.color }}>VAR{v.name}</Label>
                        <Input value={editingFormulaValues[v.name] ?? ""} onChange={(event) => setEditingFormulaValues((prev) => ({ ...prev, [v.name]: event.target.value }))} placeholder={t("plankiste:project.formula", "Rechenweg")} className="h-8 text-xs" />
                        <div className="flex items-center gap-2">
                          <Input type="number" value={editingOverrideValues[v.name] ?? ""} onChange={(event) => setEditingOverrideValues((prev) => ({ ...prev, [v.name]: event.target.value }))} placeholder={t("plankiste:project.overrideValue", "Ergebnis überschreiben (optional)")} className="h-8 text-xs" />
                          {v.unit && <span className="text-xs text-muted-foreground">{v.unit}</span>}
                          {editingOverrideValues[v.name] && <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setEditingOverrideValues((prev) => { const next = { ...prev }; delete next[v.name]; return next; })}>{t("common:reset", "Zurücksetzen")}</Button>}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVarEditMode(false)}>{t("common:cancel")}</Button>
                      <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={saveVarEdit} disabled={updatePlanDataMutation.isPending}>
                        {t("common:save")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {shoppingItemsList.length > 0 && (
          <div>
            <button type="button" className="w-full flex items-center justify-between py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setActiveSection(s => s === "shopping" ? null : "shopping")}>
              <span className="flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5" /> {t("plankiste:items.title", "Einkaufsartikel")} ({shoppingItemsList.length})</span>
              <span>{activeSection === "shopping" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "shopping" && (
              <div className="space-y-1 mt-1 pl-2">
                {shoppingItemsList.map((item, idx) => {
                  const phase = getPhase((item as any).phaseId);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {phase && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.color }} />}
                      <span className="flex-1">{enableVariables ? <VarText text={item.name} variables={calculatedVariables} /> : item.name}</span>
                      {item.quantity && <span className="text-muted-foreground font-mono">{enableVariables ? <VarText text={item.quantity} variables={calculatedVariables} /> : item.quantity}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {taskItemsList.length > 0 && (
          <div>
            <button type="button" className="w-full flex items-center justify-between py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setActiveSection(s => s === "tasks" ? null : "tasks")}>
              <span className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> {t("plankiste:tasks.title", "Aufgaben")} ({taskItemsList.length})</span>
              <span>{activeSection === "tasks" ? "▲" : "▼"}</span>
            </button>
            {activeSection === "tasks" && (
              <div className="space-y-1 mt-1 pl-2">
                {taskItemsList.map((task, idx) => {
                  const phase = getPhase((task as any).phaseId);
                  return (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {phase && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: phase.color }} />}
                      <div className="flex-1">
                        <span>{enableVariables ? <VarText text={task.name} variables={calculatedVariables} /> : task.name}</span>
                        {task.daysOffset != null && task.daysOffset > 0 && <span className="ml-2 text-muted-foreground">+{task.daysOffset}d</span>}
                        {task.description && <p className="text-muted-foreground line-clamp-1 mt-0.5">{enableVariables ? <VarText text={task.description} variables={calculatedVariables} /> : task.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ── Start-Dialog ── */}
      {startDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStartDialogOpen(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-base mb-4">{t("plankiste:project.startProject", "Projekt starten")}</h3>

            {/* Startdatum */}
            <div className="mb-5">
              <label className="text-sm font-medium">{t("plankiste:project.startDate", "Startdatum")}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
            </div>

            {/* Phasen als Überschriften mit Variablen darunter */}
            {phases.length > 0 && (
              <div className="mb-5 space-y-4">
                <p className="text-sm font-medium">{t("plankiste:project.selectPhases", "Phasen die jetzt gestartet werden:")}</p>
                {sortedPhases.map(phase => {
                  const phaseTaskCount = taskItemsList.filter(t => (t as any).phaseId === phase.id).length;
                  const phaseShopCount = shoppingItemsList.filter(s => (s as any).phaseId === phase.id).length;
                  const phaseTasks = taskItemsList.filter(task => (task as any).phaseId === phase.id);
                  const isSelected = selectedPhaseIds.includes(phase.id);
                  return (
                    <div key={phase.id} className={`rounded-lg border p-3 transition-colors ${isSelected ? "border-amber-300 bg-amber-50/50" : "border-border bg-muted/30 opacity-60"}`}>
                      {/* Phase-Header mit Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => setSelectedPhaseIds(prev =>
                            e.target.checked ? [...prev, phase.id] : prev.filter(id => id !== phase.id)
                          )}
                          className="w-4 h-4 rounded"
                        />
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                        <span className="text-sm font-medium flex-1">{phase.name}</span>
                        <span className="text-xs text-muted-foreground">{phaseTaskCount}A + {phaseShopCount}E</span>
                      </label>
                      {/* Aufgaben dieser Phase */}
                      {isSelected && phaseTasks.length > 0 && (
                        <div className="pl-6 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Aufgaben</p>
                          {phaseTasks.map((task, taskIndex) => {
                            const originalIndex = taskItemsList.indexOf(task);
                            const inputNames = variableAvailability?.taskInputNamesByKey[planTaskKey(task, originalIndex)] ?? [];
                            return (
                            <div key={`${phase.id}-${task.name}-${taskIndex}`} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-foreground">{task.name}</div>
                                {task.description && <div className="line-clamp-2 mt-0.5">{task.description}</div>}
                                {inputNames.length > 0 && <div className="mt-1 text-emerald-700 dark:text-emerald-300">{t("plankiste:project.variableAvailability.inputTask", "Erfasst zu Beginn: {{variables}}", { variables: inputNames.join(", ") })}</div>}
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                      {isSelected && getPhaseVariableIssues(phase.id).length > 0 && (
                        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                          {getPhaseVariableIssues(phase.id).map((issue) => <p key={issue}>• {issue}</p>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPhaseVariableIssues.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-medium">{t("plankiste:project.variableAvailability.startBlocked", "Der Start ist noch nicht möglich.")}</p>
                {selectedPhaseVariableIssues.map((issue) => <p key={issue} className="mt-1">• {issue}</p>)}
              </div>
            )}


            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setStartDialogOpen(false)}>{t("common:cancel")}</Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => startMutation.mutate({
                  projectId, householdId, memberId, startDate,
                  phasesToStart: phases.length > 0 ? selectedPhaseIds : undefined,
                })}
                disabled={startMutation.isPending || selectedPhaseVariableIssues.length > 0}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {t("plankiste:project.startNow", "Jetzt starten")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase-Start-Dialog ── */}
      {phaseStartDialogId && (() => {
        const phase = phases.find(p => p.id === phaseStartDialogId);
        if (!phase) return null;
        const phaseTasks = taskItemsList.filter(task => (task as any).phaseId === phaseStartDialogId);
        const phaseVariableIssues = getPhaseVariableIssues(phaseStartDialogId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setPhaseStartDialogId(null)} />
            <div className="relative bg-background rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: phase.color }} />
                {t("plankiste:project.startPhaseTitle", "Phase starten")}: {phase.name}
              </h3>
              <div className="mb-4">
                <label className="text-sm font-medium">{t("plankiste:project.startDate", "Startdatum")}</label>
                <input type="date" value={phaseStartDate} onChange={e => setPhaseStartDate(e.target.value)} className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-background" />
              </div>
              {phaseTasks.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Aufgaben</p>
                  {phaseTasks.map((task, taskIndex) => {
                    const originalIndex = taskItemsList.indexOf(task);
                    const inputNames = variableAvailability?.taskInputNamesByKey[planTaskKey(task, originalIndex)] ?? [];
                    return (
                    <div key={`${phaseStartDialogId}-${task.name}-${taskIndex}`} className="text-xs flex items-start gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-medium">{task.name}</div>
                        {task.description && <div className="text-muted-foreground line-clamp-2 mt-0.5">{task.description}</div>}
                        {inputNames.length > 0 && <div className="mt-1 text-emerald-700 dark:text-emerald-300">{t("plankiste:project.variableAvailability.inputTask", "Erfasst zu Beginn: {{variables}}", { variables: inputNames.join(", ") })}</div>}
                      </div>
                    </div>
                  )})}
                </div>
              )}
              {phaseVariableIssues.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">{t("plankiste:project.variableAvailability.startBlocked", "Der Start ist noch nicht möglich.")}</p>
                  {phaseVariableIssues.map((issue) => <p key={issue} className="mt-1">• {issue}</p>)}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setPhaseStartDialogId(null)}>{t("common:cancel")}</Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => startPhaseMutation.mutate({
                    projectId, householdId, memberId,
                    phaseId: phaseStartDialogId,
                    startDate: phaseStartDate,
                  })}
                  disabled={startPhaseMutation.isPending || phaseVariableIssues.length > 0}
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  {t("plankiste:project.startNow", "Jetzt starten")}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </Card>
  );
}

export default function Projects() {
  const { t } = useTranslation(["projects", "tasks", "common"]);
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectView, setProjectView] = useState<"active" | "archived">("active");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedExistingTasks, setSelectedExistingTasks] = useState<number[]>([]);

  // Task form state
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<number[]>([]);
  const [taskPrerequisites, setTaskPrerequisites] = useState<number[]>([]);
  const [taskPhaseId, setTaskPhaseId] = useState("unphased");
  const [taskFollowups, setTaskFollowups] = useState<number[]>([]);
  const [additionalProjectIds, setAdditionalProjectIds] = useState<number[]>([]);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState("");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months">("days");
  const [hasRotation, setHasRotation] = useState(false);
  const [rotationRequired, setRotationRequired] = useState("");
  const [rotationExcluded, setRotationExcluded] = useState<number[]>([]);
  const [shareWithNeighbors, setShareWithNeighbors] = useState(false);
  const [sharedHouseholdIds, setSharedHouseholdIds] = useState<number[]>([]);

  // Form state for project creation/editing
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState<"planning" | "active" | "completed" | "cancelled">("planning");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [isNeighborhoodProject, setIsNeighborhoodProject] = useState(false);
  const [enableProjectVariables, setEnableProjectVariables] = useState(false);
  const [projectPhases, setProjectPhases] = useState<EditableProjectPhase[]>([]);

  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: connectedHouseholds = [] } = trpc.neighborhood.getConnectedHouseholds.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: connectedMembers = [] } = trpc.neighborhood.getConnectedMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && shareWithNeighbors }
  );

  // Load all dependencies once for all tasks
  const { data: dependencies = [] } = trpc.projects.getAllDependencies.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.created", "Projekt erfolgreich erstellt"));
      refetchProjects();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(t("projects:messages.createError", "Fehler beim Erstellen des Projekts: ") + error.message);
    },
  });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.updated", "Projekt erfolgreich aktualisiert"));
      refetchProjects();
      setIsEditDialogOpen(false);
      setEditingProject(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(t("projects:messages.updateError", "Fehler beim Aktualisieren des Projekts: ") + error.message);
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.deleted", "Projekt erfolgreich gelöscht"));
      refetchProjects();
      if (selectedProjectId === editingProject?.id) {
        setSelectedProjectId(null);
      }
    },
    onError: (error) => {
      toast.error(t("projects:messages.deleteError", "Fehler beim Löschen des Projekts: ") + error.message);
    },
  });

  const archiveProjectMutation = trpc.projects.archive.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.archived", "Projekt erfolgreich archiviert"));
      refetchProjects();
      if (selectedProjectId) {
        setSelectedProjectId(null);
      }
    },
    onError: (error) => {
      toast.error(t("projects:messages.archiveError", "Fehler beim Archivieren des Projekts: ") + error.message);
    },
  });

  const unarchiveProjectMutation = trpc.projects.unarchive.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.restored", "Projekt erfolgreich wiederhergestellt"));
      refetchProjects();
    },
    onError: (error) => {
      toast.error(t("projects:messages.restoreError", "Fehler beim Wiederherstellen des Projekts: ") + error.message);
    },
  });

  // Task mutations
  const utils = trpc.useUtils();
  
  const updateBidirectionalDependenciesMutation = trpc.projects.updateBidirectionalDependencies.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.projects.getAllDependencies.invalidate();
      toast.success(t("tasks:messages.bidirectionalLinks", "Bidirektionale Verknüpfungen erstellt"));
    },
    onError: () => {
      toast.error(t("projects:messages.linkError"));
    },
  });
  
  const completeTaskMutation = trpc.tasks.completeTask.useMutation({
    onSuccess: () => {
      toast.success(t("tasks:messages.taskCompleted", "Aufgabe erfolgreich abgeschlossen!"));
      utils.tasks.list.invalidate();
      setCompleteDialogOpen(false);
    },
    onError: () => {
      toast.error(t("projects:messages.completeError"));
    },
  });

  const milestoneMutation = trpc.tasks.addMilestone.useMutation({
    onSuccess: () => {
      toast.success(t("tasks:messages.milestoneAdded", "Zwischensieg gespeichert!"));
      utils.tasks.list.invalidate();
      setMilestoneDialogOpen(false);
    },
    onError: () => {
      toast.error(t("projects:messages.milestoneError"));
    },
  });

  const reminderMutation = trpc.tasks.sendReminder.useMutation({
    onSuccess: () => {
      toast.success(t("tasks:messages.reminderSent", "Erinnerung gesendet!"));
      setReminderDialogOpen(false);
    },
    onError: () => {
      toast.error(t("projects:messages.reminderError"));
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success(t("tasks:messages.taskDeleted", "Aufgabe erfolgreich gelöscht"));
      utils.tasks.list.invalidate();
      utils.shopping.list.invalidate();
    },
    onError: () => {
      toast.error(t("projects:messages.taskUpdateError"));
    },
  });

  const handleDeleteTask = (taskId: number) => {
    if (confirm(t("tasks:messages.deleteConfirm", "Möchten Sie diese Aufgabe wirklich löschen?"))) {
      deleteTaskMutation.mutate({
        taskId,
        householdId: household!.householdId,
        memberId: member!.memberId,
      });
    }
  };

  const handleCompleteTask = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!selectedTask) return;
    await completeTaskMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household!.householdId,
      memberId: member!.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectStatus("planning");
    setProjectStartDate("");
    setProjectEndDate("");
    setIsNeighborhoodProject(false);
    setEnableProjectVariables(false);
    setProjectPhases([]);
  };

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast.error(t("projects:messages.nameRequired", "Bitte geben Sie einen Projektnamen ein"));
      return;
    }

    createProjectMutation.mutate({
      householdId: household!.householdId,
      memberId: member!.memberId,
      name: projectName,
      description: projectDescription || undefined,
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
      isNeighborhoodProject,
      enableVariables: enableProjectVariables,
      planPhases: projectPhases,
    });
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectName.trim()) {
      toast.error(t("projects:messages.nameRequired", "Bitte geben Sie einen Projektnamen ein"));
      return;
    }

    updateProjectMutation.mutate({
      id: editingProject.id,
      householdId: household!.householdId,
      memberId: member!.memberId,
      name: projectName,
      description: projectDescription || undefined,
      status: projectStatus,
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
      isNeighborhoodProject,
      enableVariables: enableProjectVariables,
      planPhases: projectPhases,
    });
  };

  const handleDeleteProject = (projectId: number) => {
    if (confirm(t("projects:confirmDelete", "Möchten Sie dieses Projekt wirklich löschen?"))) {
      deleteProjectMutation.mutate({ id: projectId, householdId: household!.householdId, memberId: member!.memberId });
    }
  };

  const openEditDialog = (project: any) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectStatus(project.status);
    setProjectStartDate(project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "");
    setProjectEndDate(project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : "");
    setIsNeighborhoodProject(project.isNeighborhoodProject || false);
    setEnableProjectVariables((project as any).enableVariables === true);
    setProjectPhases(Array.isArray((project as any).planPhases) ? (project as any).planPhases : []);
    setIsEditDialogOpen(true);
  };

  // Filter projects based on archive status
  const filteredProjects = useMemo(
    () => projects.filter(p => projectView === "archived" ? p.isArchived : !p.isArchived),
    [projects, projectView]
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectPhases = useMemo(
    () => Array.isArray((selectedProject as any)?.planPhases)
      ? ([...(selectedProject as any).planPhases] as EditableProjectPhase[]).sort((a, b) => a.order - b.order)
      : [],
    [selectedProject],
  );
  const selectedProjectPhaseByTaskId = useMemo(() => {
    const items = Array.isArray((selectedProject as any)?.planTaskItems) ? (selectedProject as any).planTaskItems : [];
    return new Map<number, string>(items.filter((item: any) => Number.isFinite(Number(item.id)) && item.phaseId).map((item: any) => [Number(item.id), item.phaseId]));
  }, [selectedProject]);
  const projectTasks = useMemo(
    () => {
      if (!selectedProjectId) return [];
      const filtered = tasks.filter(t => t.projectIds && t.projectIds.includes(selectedProjectId));
      // Topologisch sortieren
      const withDeps = filtered.map(t => ({
        ...t,
        prerequisiteItemIds: dependencies
          .filter(d => d.taskId === t.id && d.dependencyType === "prerequisite")
          .map(d => ({ id: d.dependsOnTaskId })),
      }));
      return topoSortTasks(withDeps);
    },
    [selectedProjectId, tasks, dependencies]
  );
  const isTaskInStartedPhase = useCallback((task: any) => {
    const phaseId = selectedProjectPhaseByTaskId.get(task.planTaskItemId ?? task.id);
    if (!phaseId) return true;
    const phase = selectedProjectPhases.find((entry) => entry.id === phaseId);
    return phase?.status === "active" || phase?.status === "completed";
  }, [selectedProjectPhaseByTaskId, selectedProjectPhases]);
  const activeProjectTasks = useMemo(() => projectTasks.filter(isTaskInStartedPhase), [projectTasks, isTaskInStartedPhase]);
  const pendingProjectPhases = useMemo(() => selectedProjectPhases
    .filter((phase) => phase.status !== "active" && phase.status !== "completed")
    .map((phase) => ({ ...phase, tasks: projectTasks.filter((task: any) => selectedProjectPhaseByTaskId.get(task.planTaskItemId ?? task.id) === phase.id) }))
    .filter((phase) => phase.tasks.length > 0), [selectedProjectPhases, projectTasks, selectedProjectPhaseByTaskId]);

  const addTaskMutation = trpc.tasks.add.useMutation({
    onError: (error) => {
      toast.error(t("tasks:messages.createError", "Fehler beim Erstellen der Aufgabe") + ": " + error.message);
    },
  });
  const updateProjectPlanDataMutation = trpc.planProjects.updatePlanData.useMutation();

  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success(t("projects:messages.tasksAssigned", "Aufgaben erfolgreich zugeordnet"));
      utils.tasks.list.invalidate();
      setIsAssignTaskDialogOpen(false);
      setSelectedExistingTasks([]);
    },
    onError: (error) => {
      toast.error(t("projects:messages.tasksAssignError", "Fehler beim Zuordnen der Aufgaben: ") + error.message);
    },
  });

  const resetTaskForm = () => {
    setTaskName("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskDueTime("");
    setTaskAssignees([]);
    setTaskPrerequisites([]);
    setTaskPhaseId("unphased");
    setTaskFollowups([]);
    setAdditionalProjectIds([]);
    setShareWithNeighbors(false);
    setSharedHouseholdIds([]);
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      toast.error(t("tasks:messages.nameRequired", "Bitte geben Sie einen Aufgabennamen ein"));
      return;
    }

    if (taskAssignees.length === 0) {
      toast.error(t("tasks:messages.selectAtLeastOneAssignee", "Bitte wählen Sie mindestens einen Verantwortlichen"));
      return;
    }

    if (!household || !selectedProjectId) {
                    toast.error(t("projects:messages.noProject", "Kein Projekt ausgewählt"));
      return;
    }

    try {
      // Create due date from date and time
      let dueDateTime = null;
      if (taskDueDate) {
        dueDateTime = new Date(taskDueDate);
        if (taskDueTime) {
          const [hours, minutes] = taskDueTime.split(":");
          dueDateTime.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      // Create task
      const result = await addTaskMutation.mutateAsync({
        householdId: household.householdId,
        memberId: member?.memberId || 0,
        name: taskName,
        description: taskDescription || undefined,
        assignedTo: taskAssignees.length > 0 ? taskAssignees : undefined, // Array of assignees
        dueDate: dueDateTime ? dueDateTime.toISOString() : undefined,
        projectIds: selectedProjectId ? [selectedProjectId, ...additionalProjectIds] : undefined,
        frequency: isRepeating && repeatInterval ? (
          repeatUnit === "days" ? "daily" : repeatUnit === "weeks" ? "weekly" : "monthly"
        ) : undefined,
        repeatInterval: isRepeating && repeatInterval ? parseInt(repeatInterval) : undefined,
        enableRotation: hasRotation,
        requiredPersons: hasRotation && rotationRequired ? parseInt(rotationRequired) : undefined,
        excludedMembers: hasRotation && rotationExcluded.length > 0 ? rotationExcluded : undefined,
        sharedHouseholdIds: shareWithNeighbors && sharedHouseholdIds.length > 0 ? sharedHouseholdIds : undefined,
      });

      if (taskPhaseId !== "unphased") {
        const currentPlanItems = Array.isArray((selectedProject as any)?.planTaskItems) ? (selectedProject as any).planTaskItems : [];
        await updateProjectPlanDataMutation.mutateAsync({
          projectId: selectedProjectId,
          planTaskItems: [
            ...currentPlanItems.filter((item: any) => Number(item.id) !== result.id),
            { id: result.id, name: taskName, description: taskDescription || undefined, phaseId: taskPhaseId, sortOrder: currentPlanItems.length },
          ],
        });
        await utils.projects.list.invalidate({ householdId: household.householdId });
      }

      // Add dependencies if any
      if (taskPrerequisites.length > 0 || taskFollowups.length > 0) {
        await addDependenciesMutation.mutateAsync({
          taskId: result.id,
          householdId: household.householdId,
          prerequisites: taskPrerequisites.length > 0 ? taskPrerequisites : undefined,
          followups: taskFollowups.length > 0 ? taskFollowups : undefined,
        });

        // Prepare dependency links for confirmation dialog
        const dependencyLinks = [
          ...taskPrerequisites.map((taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            return {
              taskId,
              taskName: task?.name || `Aufgabe ${taskId}`,
              type: "prerequisite" as const,
            };
          }),
          ...taskFollowups.map((taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            return {
              taskId,
              taskName: task?.name || `Aufgabe ${taskId}`,
              type: "followup" as const,
            };
          }),
        ];

        // Dependencies are already created
      }
      
      // Now invalidate and refetch all queries
      await utils.tasks.list.invalidate();
      await utils.projects.getTaskDependencies.invalidate();
      await utils.projects.getAllDependencies.invalidate();
      
      // Refetch to ensure UI updates immediately
      const refreshedTasks = await utils.tasks.list.fetch({ householdId: household.householdId });
      await utils.projects.getAllDependencies.fetch({ householdId: household.householdId });
      
      // Close dialog and reset form
      setIsAddTaskDialogOpen(false);
      resetTaskForm();
      
      // Find and open detail dialog for new task
      const newTask = refreshedTasks.find(t => t.id === result.id);
      if (newTask) {
        // Prefetch dependencies for the new task before opening dialog
        await utils.projects.getTaskDependencies.fetch({ taskId: newTask.id });
        setSelectedTask(newTask);
        setIsTaskDetailDialogOpen(true);
      } else {
        toast.success(t("tasks:messages.created", "Aufgabe hinzugefügt"));
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error(t("tasks:messages.createError", "Fehler beim Erstellen der Aufgabe"));
    }
  };

  const getMemberName = (memberId: number | null) => {
    if (!memberId) return t("common:labels.unassigned", "Nicht zugewiesen");
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || t("common:labels.unknown", "Unbekannt");
  };
  
  const getMemberNames = (memberIds: number[] | number | string | null | undefined) => {
    if (memberIds === null || memberIds === undefined) return t("common:labels.unassigned", "Nicht zugewiesen");
    let ids: number[] = [];
    if (Array.isArray(memberIds)) {
      ids = memberIds;
    } else if (typeof memberIds === 'number') {
      ids = [memberIds];
    } else if (typeof memberIds === 'string') {
      try {
        const parsed = JSON.parse(memberIds);
        ids = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        ids = [];
      }
    }
    if (ids.length === 0) return t("common:labels.unassigned", "Nicht zugewiesen");
    return ids.map(id => {
      const memberData = members.find((m) => m.id === id);
      return memberData?.memberName || t("common:labels.unknown", "Unbekannt");
    }).join(", ");
  };

  const getFrequencyBadge = (task: typeof tasks[0]) => {
    if (!task.repeatInterval || !task.repeatUnit) return null;
    
    const interval = task.repeatInterval;
    const unit = task.repeatUnit;
    
    if (interval === 1) {
      if (unit === "days") return t("tasks:repeat.daily", "Täglich");
      if (unit === "weeks") return t("tasks:repeat.weekly", "Wöchentlich");
      if (unit === "months") return t("tasks:repeat.monthly", "Monatlich");
    }
    
    const unitText = unit === "days" ? t("tasks:repeat.day", "Tag") : unit === "weeks" ? t("tasks:repeat.week", "Woche") : t("tasks:repeat.month", "Monat");
    return `${t("tasks:repeat.every", "Alle")} ${interval} ${unitText}${interval > 1 ? "e" : ""}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      planning: { label: t("projects:status.planning", "Planung"), variant: "outline" as const },
      active: { label: t("projects:status.active", "Aktiv"), variant: "default" as const },
      completed: { label: t("projects:status.completed", "Abgeschlossen"), variant: "outline" as const },
      cancelled: { label: t("projects:status.cancelled", "Abgebrochen"), variant: "destructive" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.planning;
  };

  // Show loading state if household or member not loaded
  if (!household || !member) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-6xl">
          <div className="text-center py-12 text-muted-foreground">
            Lädt Projekte...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl pb-24">
                <PageHeader
          icon={FolderKanban}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          title={t("projects:title")}
        />
        <div className="flex items-center gap-2 -mt-4 mb-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("projects:newProject", "Neues Projekt")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("projects:createProject", "Neues Projekt erstellen")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("projects:projectName", "Projektname")} *</Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={t("projects:projectNamePlaceholder", "z.B. Gartenrenovierung")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("common:labels.description", "Beschreibung")}</Label>
                  <Textarea
                    id="description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder={t("projects:descriptionPlaceholder", "Projektbeschreibung...")}
                    rows={3}
                  />
                </div>

                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="project-use-variables"
                      checked={enableProjectVariables}
                      onCheckedChange={(checked) => setEnableProjectVariables(checked === true)}
                    />
                    <div className="min-w-0">
                      <Label htmlFor="project-use-variables" className="cursor-pointer font-medium text-violet-950 dark:text-violet-100">{t("projects:variables.use", "Projektvariablen verwenden")}</Label>
                      <p className="mt-1 text-xs text-muted-foreground">{t("projects:variables.useDescription", "VAR-Namen werden in Aufgaben erkannt. Feste Vorgaben und Werte je Projektdurchlauf können anschließend getrennt gepflegt werden.")}</p>
                    </div>
                  </div>
                </div>

                <ProjectPhasesEditor phases={projectPhases} onChange={setProjectPhases} t={t} />

                <div className="space-y-2">
                  <Label htmlFor="status">{t("common:labels.status", "Status")}</Label>
                  <Select value={projectStatus} onValueChange={(value: any) => setProjectStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">{t("projects:status.planning", "Planung")}</SelectItem>
                      <SelectItem value="active">{t("projects:status.active", "Aktiv")}</SelectItem>
                      <SelectItem value="completed">{t("projects:status.completed", "Abgeschlossen")}</SelectItem>
                      <SelectItem value="cancelled">{t("projects:status.cancelled", "Abgebrochen")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t("common:labels.startDate", "Startdatum")}</Label>
                    <DatePickerInput
                    id="startDate"
                    value={projectStartDate}
                    onChange={(val) => setProjectStartDate(val)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t("common:labels.endDate", "Enddatum")}</Label>
                    <DatePickerInput
                    id="endDate"
                    value={projectEndDate}
                    onChange={(val) => setProjectEndDate(val)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t("common:actions.cancel")}
                </Button>
                <Button onClick={handleCreateProject}>
                  {t("projects:createProject", "Projekt erstellen")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              {t("projects:projectList", "Projektliste")}
            </h2>

            {/* Archive Tabs */}
            <Tabs value={projectView} onValueChange={(v) => setProjectView(v as "active" | "archived")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">{t("projects:status.active", "Aktiv")}</TabsTrigger>
                <TabsTrigger value="archived">{t("projects:archived", "Archiv")}</TabsTrigger>
              </TabsList>
            </Tabs>

            {projectsLoading ? (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{t("common:loading", "Lädt...")}</p>
                </CardContent>
              </Card>
            ) : filteredProjects.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("projects:messages.noProjects")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProjects.map((project) => {
                const projectTaskCount = tasks.filter(t => t.projectIds && t.projectIds.includes(project.id)).length;
                const completedTaskCount = tasks.filter(t => t.projectIds && t.projectIds.includes(project.id) && t.isCompleted).length;
                const statusBadge = getStatusBadge(project.status);

                return (
                  <Card
                    key={project.id}
                    className={`shadow-sm cursor-pointer transition-all hover:shadow-md ${
                      selectedProjectId === project.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={statusBadge.variant} className="text-xs">
                              {statusBadge.label}
                            </Badge>
                            {project.isNeighborhoodProject && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {t("projects:neighborhood", "Nachbarschaft")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("projects:taskProgress", "{{completed}} / {{total}} Aufgaben erledigt", { completed: completedTaskCount, total: projectTaskCount })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {projectView === "active" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(project);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              {project.status === "completed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(t("projects:confirmArchive", "Möchten Sie dieses Projekt archivieren?"))) {
                                      archiveProjectMutation.mutate({ id: project.id, householdId: household!.householdId, memberId: member!.memberId });
                                    }
                                  }}
                                  title={t("projects:actions.archive", "Archivieren")}
                                >
                                  <Archive className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                unarchiveProjectMutation.mutate({ id: project.id, householdId: household!.householdId, memberId: member!.memberId });
                              }}
                              title={t("projects:actions.restore", "Wiederherstellen")}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Project Details */}
          <div className="lg:col-span-2">
            {!selectedProject ? (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t("projects:messages.selectProject", "Wählen Sie ein Projekt aus der Liste aus, um Details und Aufgaben anzuzeigen")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Project Header */}
                <Card className="shadow-md">
                  <CardHeader>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        {selectedProject.name}
                      </CardTitle>
                      {selectedProject.description && (
                        <CardDescription className="mt-2">
                          {selectedProject.description}
                        </CardDescription>
                      )}
                      
                      {/* Button rows below project name */}
                      <div className="flex flex-col gap-2 mt-4">
                        {/* First row: Task buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddTaskDialogOpen(true)}
                          >
                              <Plus className="h-4 w-4 mr-1" />
                            {t("projects:actions.newTask", "Neue Aufgabe")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAssignTaskDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {t("projects:actions.assignExisting", "Bestehende zuordnen")}
                          </Button>
                        </div>
                        
                        {/* Second row: Edit and Delete */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(selectedProject)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {t("common:actions.edit", "Bearbeiten")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(t("projects:confirmDelete", "Möchten Sie dieses Projekt wirklich löschen?"))) {
                                deleteProjectMutation.mutate({ id: selectedProject.id, householdId: household!.householdId, memberId: member!.memberId });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("common:actions.delete", "Löschen")}
                          </Button>
                        </div>
                        
                        {/* Third row: Archive/Restore */}
                        {(selectedProject.status === "completed" && !selectedProject.isArchived) && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(t("projects:confirmArchive", "Möchten Sie dieses Projekt archivieren?"))) {
                                  archiveProjectMutation.mutate({ id: selectedProject.id, householdId: household!.householdId, memberId: member!.memberId });
                                }
                              }}
                              title={t("projects:actions.archive", "Archivieren")}
                            >
                              <Archive className="h-4 w-4 mr-1" />
                              {t("projects:actions.archive", "Archivieren")}
                            </Button>
                          </div>
                        )}
                        {selectedProject.isArchived && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                unarchiveProjectMutation.mutate({ id: selectedProject.id, householdId: household!.householdId, memberId: member!.memberId });
                              }}
                              title={t("projects:actions.restore", "Wiederherstellen")}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("projects:actions.restore", "Wiederherstellen")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Badge variant={getStatusBadge(selectedProject.status).variant}>
                        {getStatusBadge(selectedProject.status).label}
                      </Badge>
                      {selectedProject.startDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Start: {format(new Date(selectedProject.startDate), "dd.MM.yyyy")}
                        </Badge>
                      )}
                      {selectedProject.endDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Ende: {format(new Date(selectedProject.endDate), "dd.MM.yyyy")}
                        </Badge>
                      )}
                      {selectedProject.isNeighborhoodProject && (
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {t("projects:neighborhoodProject", "Nachbarschaftsprojekt")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Plan-Sektion (nur für Projekte aus Plankiste) */}
                {selectedProjectId && household && member && (
                  <ProjectPlanSection
                    projectId={selectedProjectId}
                    householdId={household.householdId}
                    memberId={member.memberId}
                  />
                )}

                {/* Task Views */}
                <Tabs defaultValue="list" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      {t("projects:views.list", "Listenansicht")}
                    </TabsTrigger>
                    <TabsTrigger value="gantt" className="flex items-center gap-2">
                      <GanttChart className="h-4 w-4" />
                      {t("projects:views.gantt", "Gantt-Diagramm")}
                    </TabsTrigger>
                  </TabsList>

                  {/* List View */}
                  <TabsContent value="list">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">{t("tasks:title", "Aufgaben")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activeProjectTasks.length === 0 && pendingProjectPhases.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {t("projects:messages.noTasksInProject", "Keine Aufgaben in diesem Projekt. Erstellen Sie Aufgaben auf der Aufgabenseite.")}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {activeProjectTasks.map((task) => {
                              const frequency = getFrequencyBadge(task);

                              return (
                                <Card 
                                  key={task.id} 
                                  className={`shadow-sm cursor-pointer ${task.isCompleted ? "opacity-60" : "hover:shadow-md"}`}
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsTaskDetailDialogOpen(true);
                                  }}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>
                                            {task.name}
                                          </span>
                                          {task.isCompleted && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t("tasks:status.completed", "Erledigt")}
                            </Badge>
                                          )}
                                          {!task.isCompleted && task.dueDate && isPast(new Date(task.dueDate)) && (
                                            <Badge variant="destructive" className="text-xs">
                              {t("tasks:status.overdue", "Überfällig")}
                            </Badge>
                                          )}
                                          {(task as any).isSharedWithUs && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">
                                              <Users className="h-3 w-3 mr-1" />
                                              {t("tasks:linkedWith", "Verknüpft mit")} {(task as any).householdName || t("tasks:otherHousehold", "anderem Haushalt")}
                                            </Badge>
                                          )}
                                          {(task as any).sharedHouseholdCount > 0 && !(task as any).isSharedWithUs && (task as any).sharedHouseholdNames && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">
                                              <Users className="h-3 w-3 mr-1" />
                                              {t("tasks:sharedWith", "Geteilt mit")} {(task as any).sharedHouseholdNames}
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                          <span>{getMemberNames(task.assignedTo)}</span>
                                          {task.dueDate && (
                                            <span>• {format(new Date(task.dueDate), "dd.MM.yyyy, HH:mm")} Uhr</span>
                                          )}
                                          <TaskDependencies
                                            taskId={task.id}
                                            allTasks={tasks}
                                            dependencies={dependencies}
                                            compact
                                          />
                                          {frequency && (
                                            <Badge variant="outline" className="text-xs">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {frequency}
                                            </Badge>
                                          )}
                                          {task.enableRotation && (
                                            <Badge variant="outline" className="text-xs">
                                              <Target className="h-3 w-3 mr-1" />
                              {t("tasks:repeat.rotation", "Rotation")}
                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Task Action Buttons */}
                                      <div className="grid grid-cols-2 gap-1 shrink-0">
                                        {canDirectlyManageTask(task.assignedTo, member?.memberId ?? 0) && !task.isCompleted && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setCompleteDialogOpen(true);
                                              }}
                                              className="touch-target text-green-600 hover:text-green-600 hover:bg-green-50"
                                              title={t("tasks:actions.complete", "Aufgabe abschließen")}
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setReminderDialogOpen(true);
                                              }}
                                              className="touch-target text-yellow-600 hover:text-yellow-600 hover:bg-yellow-50"
                                              title={t("tasks:actions.sendReminder", "Erinnerung senden")}
                                            >
                                              <Bell className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setMilestoneDialogOpen(true);
                                              }}
                                              className="touch-target text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                                              title={t("tasks:actions.recordMilestone", "Zwischenziel dokumentieren")}
                                            >
                                              <Target className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                        {canDirectlyManageTask(task.assignedTo, member?.memberId ?? 0) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTask(task.id);
                                            }}
                                            className="touch-target text-destructive hover:text-destructive hover:bg-destructive/10"
                                            title={t("tasks:actions.delete", "Aufgabe löschen")}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                            {pendingProjectPhases.map((phase) => (
                              <div key={phase.id} className="rounded-lg border border-dashed p-3 opacity-55" style={{ borderColor: phase.color }}>
                                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color }} />
                                  {phase.name}
                                  <Badge variant="outline" className="ml-auto text-xs">{t("projects:phases.pending", "Noch nicht gestartet")}</Badge>
                                </div>
                                <div className="space-y-1 pl-4 text-xs text-muted-foreground">
                                  {phase.tasks.map((task: any) => <div key={task.id} className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5" />{task.name}</div>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Gantt View */}
                  <TabsContent value="gantt">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">{t("projects:views.gantt", "Gantt-Diagramm")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {t("projects:messages.noTasksInProject", "Keine Aufgaben in diesem Projekt. Erstellen Sie Aufgaben auf der Aufgabenseite.")}
                          </p>
                        ) : (
                          <GanttChartView tasks={projectTasks} members={members} />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Assign Existing Tasks Dialog */}
        <Dialog open={isAssignTaskDialogOpen} onOpenChange={setIsAssignTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("projects:dialogs.assignTasks", "Bestehende Aufgaben zum Projekt zuordnen")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("projects:dialogs.availableTasks", "Verfügbare Aufgaben (ohne Projektzuordnung)")}</Label>
                <div className="border rounded-md p-3 max-h-96 overflow-y-auto">
                  {tasks.filter(t => (!t.projectIds || t.projectIds.length === 0) && !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("projects:messages.noAvailableTasks", "Keine verfügbaren Aufgaben ohne Projektzuordnung")}
                    </p>
                  ) : (
                    tasks.filter(t => (!t.projectIds || t.projectIds.length === 0) && !t.isCompleted).map((task) => (
                      <div key={task.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <Checkbox
                          id={`assign-task-${task.id}`}
                          checked={selectedExistingTasks.includes(task.id)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setSelectedExistingTasks([...selectedExistingTasks, task.id]);
                            } else {
                              setSelectedExistingTasks(selectedExistingTasks.filter(id => id !== task.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`assign-task-${task.id}`} className="font-medium cursor-pointer">
                            {task.name}
                          </Label>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("tasks:due", "Fällig:")}: {format(new Date(task.dueDate), "dd.MM.yyyy, HH:mm")} {t("common:labels.clock", "Uhr")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignTaskDialogOpen(false)}>
                {t("common:actions.cancel", "Abbrechen")}
              </Button>
              <Button
                onClick={async () => {
                  if (selectedExistingTasks.length === 0) {
                    toast.error(t("projects:messages.selectTask", "Bitte wählen Sie mindestens eine Aufgabe aus"));
                    return;
                  }

                  if (!selectedProjectId) {
                    toast.error(t("projects:messages.noProject", "Kein Projekt ausgewählt"));
                    return;
                  }

                  try {
                    // Update each selected task with the project ID
                    for (const taskId of selectedExistingTasks) {
                      await updateTaskMutation.mutateAsync({
                        taskId: taskId,
                        householdId: household!.householdId,
                        memberId: member!.memberId,
                        projectIds: selectedProjectId ? [selectedProjectId] : undefined,
                      });
                    }
                  } catch (error) {
                    console.error("Error assigning tasks:", error);
                  }
                }}
                disabled={selectedExistingTasks.length === 0}
              >
                {t("projects:actions.assignTasks", "{{count}} Aufgabe(n) zuordnen", { count: selectedExistingTasks.length })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("projects:dialogs.addTask", "Aufgabe zu Projekt hinzufügen")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">{t("tasks:fields.name", "Aufgabenname")} *</Label>
                <Input
                  id="task-name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder={t("projects:fields.taskNamePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">{t("common:labels.description", "Beschreibung")}</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={t("tasks:descriptionPlaceholder", "Aufgabenbeschreibung...")}
                  rows={3}
                />
              </div>

              {selectedProjectPhases.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="task-phase">{t("projects:phases.taskPhase", "Projektphase")}</Label>
                  <Select value={taskPhaseId} onValueChange={setTaskPhaseId}>
                    <SelectTrigger id="task-phase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unphased">{t("projects:phases.unphased", "Ohne Phase – sofort sichtbar")}</SelectItem>
                      {selectedProjectPhases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          {phase.name}{phase.status !== "active" && phase.status !== "completed" ? ` · ${t("projects:phases.pending", "noch nicht gestartet")}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("projects:phases.taskPhaseHint", "Aufgaben einer noch nicht gestarteten Phase werden erst nach deren Start in der Aufgabenansicht angezeigt.")}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-dueDate">{t("tasks:dueDate", "Fälligkeitsdatum")}</Label>
                  <DatePickerInput
                    id="task-dueDate"
                    value={taskDueDate}
                    onChange={(val) => setTaskDueDate(val)}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-dueTime">{t("common:labels.time", "Uhrzeit")}</Label>
                  <Input
                    id="task-dueTime"
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("tasks:fields.assignees", "Verantwortliche")} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Own household members */}
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`task-assignee-${m.id}`}
                        checked={taskAssignees.includes(m.id)}
                        onCheckedChange={() => {
                          setTaskAssignees(prev =>
                            prev.includes(m.id)
                              ? prev.filter(id => id !== m.id)
                              : [...prev, m.id]
                          );
                        }}
                      />
                      <Label htmlFor={`task-assignee-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                  {/* Connected household members (only when sharing is enabled AND households selected) */}
                  {shareWithNeighbors && sharedHouseholdIds.length > 0 && connectedMembers
                    .filter((cm: any) => {
                      // Filter out duplicates: if member exists in own household (same userId), don't show from connected
                      return !members.some((m: any) => {
                        // If both have userId and they match, it's a duplicate
                        if (m.userId && cm.userId && m.userId === cm.userId) {
                          return true;
                        }
                        // If both have NULL userId, check name to avoid duplicates
                        if (!m.userId && !cm.userId && m.memberName === cm.memberName) {
                          return true;
                        }
                        return false;
                      });
                    })
                    .map((m) => (
                    <div key={`connected-${m.id}`} className="flex items-center space-x-2 p-2 rounded-lg border bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                      <Checkbox
                        id={`task-assignee-connected-${m.id}`}
                        checked={taskAssignees.includes(m.id)}
                        onCheckedChange={() => {
                          setTaskAssignees(prev =>
                            prev.includes(m.id)
                              ? prev.filter(id => id !== m.id)
                              : [...prev, m.id]
                          );
                        }}
                      />
                      <Label htmlFor={`task-assignee-connected-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName} <span className="text-xs text-muted-foreground">({m.householdName})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neighborhood Sharing */}
              {connectedHouseholds.length > 0 && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="share-with-neighbors"
                      checked={shareWithNeighbors}
                      onCheckedChange={(checked) => {
                        setShareWithNeighbors(checked as boolean);
                        if (!checked) {
                          setSharedHouseholdIds([]);
                        }
                      }}
                    />
                    <Label htmlFor="share-with-neighbors" className="cursor-pointer font-semibold">
                      {t("tasks:sharing.shareWithNeighbors", "Mit Nachbarn teilen")}
                    </Label>
                  </div>
                  {shareWithNeighbors && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-sm">{t("tasks:sharing.selectHouseholds", "Haushalte auswählen:")}</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {connectedHouseholds.map((household) => (
                          <div key={household.id} className="flex items-center space-x-2 p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`shared-household-${household.id}`}
                              checked={sharedHouseholdIds.includes(household.id)}
                              onCheckedChange={() => {
                                setSharedHouseholdIds(prev =>
                                  prev.includes(household.id)
                                    ? prev.filter(id => id !== household.id)
                                    : [...prev, household.id]
                                );
                              }}
                            />
                            <Label htmlFor={`shared-household-${household.id}`} className="cursor-pointer flex-1">
                              {household.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("tasks:prerequisites", "Voraussetzungen (optionale Aufgaben, die zuerst erledigt werden müssen)")}</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                  {tasks.filter(t => !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("projects:noOpenTasks", "Keine offenen Aufgaben verfügbar")}</p>
                  ) : (
                    <>
                      {/* Project tasks */}
                      {projectTasks.filter(t => !t.isCompleted).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t("projects:projectTasks", "Projektaufgaben")}</p>
                          {projectTasks.filter(t => !t.isCompleted).map((task) => (
                            <div key={`prereq-project-${task.id}`} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`prereq-${task.id}`}
                                checked={taskPrerequisites.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskPrerequisites([...taskPrerequisites, task.id]);
                                  } else {
                                    setTaskPrerequisites(taskPrerequisites.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`prereq-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Other household tasks */}
                      {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t("projects:otherHouseholdTasks", "Andere Haushaltsaufgaben")}</p>
                          {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).map((task) => (
                            <div key={`prereq-other-${task.id}`} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`prereq-${task.id}`}
                                checked={taskPrerequisites.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskPrerequisites([...taskPrerequisites, task.id]);
                                  } else {
                                    setTaskPrerequisites(taskPrerequisites.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`prereq-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("tasks:followups", "Folgeaufgaben (optionale Aufgaben, die danach kommen)")}</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                  {tasks.filter(t => !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("projects:noOpenTasks", "Keine offenen Aufgaben verfügbar")}</p>
                  ) : (
                    <>
                      {/* Project tasks */}
                      {projectTasks.filter(t => !t.isCompleted).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t("projects:projectTasks", "Projektaufgaben")}</p>
                          {projectTasks.filter(t => !t.isCompleted).map((task) => (
                            <div key={`followup-project-${task.id}`} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`followup-${task.id}`}
                                checked={taskFollowups.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskFollowups([...taskFollowups, task.id]);
                                  } else {
                                    setTaskFollowups(taskFollowups.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`followup-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Other household tasks */}
                      {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t("projects:otherHouseholdTasks", "Andere Haushaltsaufgaben")}</p>
                          {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).map((task) => (
                            <div key={`followup-other-${task.id}`} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`followup-${task.id}`}
                                checked={taskFollowups.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskFollowups([...taskFollowups, task.id]);
                                  } else {
                                    setTaskFollowups(taskFollowups.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`followup-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Additional Projects Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">{t("projects:dialogs.assignToOtherProjects", "Auch anderen Projekten zuordnen")}</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {projects.filter(p => p.id !== selectedProjectId && !p.isArchived).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("projects:messages.noOtherProjects", "Keine weiteren Projekte verfügbar")}
                    </p>
                  ) : (
                    projects.filter(p => p.id !== selectedProjectId && !p.isArchived).map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`additional-project-${project.id}`}
                          checked={additionalProjectIds.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAdditionalProjectIds([...additionalProjectIds, project.id]);
                            } else {
                              setAdditionalProjectIds(additionalProjectIds.filter(id => id !== project.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`additional-project-${project.id}`}
                          className="cursor-pointer flex-1"
                        >
                          {project.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Repeat Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="task-repeat"
                    checked={isRepeating}
                    onCheckedChange={(checked) => setIsRepeating(checked === true)}
                  />
                  <Label htmlFor="task-repeat" className="cursor-pointer">
                    {t("tasks:repeat.repeats", "Aufgabe wiederholt sich")}
                  </Label>
                </div>
                {isRepeating && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="repeat-interval">{t("tasks:repeat.interval", "Intervall")}</Label>
                        <Input
                          id="repeat-interval"
                          type="number"
                          min="1"
                          value={repeatInterval}
                          onChange={(e) => setRepeatInterval(e.target.value)}
                          placeholder="z.B. 7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="repeat-unit">{t("tasks:repeat.unit", "Einheit")}</Label>
                        <Select value={repeatUnit} onValueChange={(value: any) => setRepeatUnit(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">{t("tasks:repeat.days", "Tage")}</SelectItem>
                            <SelectItem value="weeks">{t("tasks:repeat.weeks", "Wochen")}</SelectItem>
                            <SelectItem value="months">{t("tasks:repeat.months", "Monate")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Rotation Section (nested under Repeat) */}
                    <div className="space-y-2 pt-4 border-t mt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="task-rotation"
                          checked={hasRotation}
                          onCheckedChange={(checked) => setHasRotation(checked === true)}
                        />
                        <Label htmlFor="task-rotation" className="cursor-pointer">
                          {t("tasks:rotation.rotationBetweenMembers", "Rotation zwischen Haushaltsmitgliedern")}
                        </Label>
                      </div>
                      {hasRotation && (
                        <div className="space-y-4 mt-2">
                          <div className="space-y-2">
                            <Label htmlFor="rotation-required">{t("tasks:rotation.requiredPersons")}</Label>
                            <Input
                              id="rotation-required"
                              type="number"
                              min="1"
                              value={rotationRequired}
                              onChange={(e) => setRotationRequired(e.target.value)}
                              placeholder={t("tasks:rotation.requiredPersonsPlaceholder")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("tasks:rotation.excludedMembers", "Ausgeschlossene Mitglieder")}</Label>
                            <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                              {members.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("tasks:rotation.noMembers", "Keine Mitglieder verfügbar")}</p>
                              ) : (
                                members.map((m) => (
                                  <div key={m.id} className="flex items-center gap-2 py-1">
                                    <Checkbox
                                      id={`excluded-${m.id}`}
                                      checked={rotationExcluded.includes(m.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setRotationExcluded([...rotationExcluded, m.id]);
                                        } else {
                                          setRotationExcluded(rotationExcluded.filter(id => id !== m.id));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`excluded-${m.id}`} className="text-sm font-normal cursor-pointer">
                                      {m.memberName}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
                {t("common:actions.cancel", "Abbrechen")}
              </Button>
              <Button onClick={handleAddTask} disabled={addTaskMutation.isPending}>
                {addTaskMutation.isPending ? t("common:loading", "Lädt...") : t("tasks:addTask", "Aufgabe hinzufügen")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("projects:editProject", "Projekt bearbeiten")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("projects:fields.name", "Projektname")} *</Label>
                <Input
                  id="edit-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t("projects:fields.projectNamePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">{t("common:labels.description", "Beschreibung")}</Label>
                <Textarea
                  id="edit-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder={t("projects:descriptionPlaceholder", "Projektbeschreibung...")}
                  rows={3}
                />
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="edit-project-use-variables"
                    checked={enableProjectVariables}
                    onCheckedChange={(checked) => setEnableProjectVariables(checked === true)}
                  />
                  <div className="min-w-0">
                    <Label htmlFor="edit-project-use-variables" className="cursor-pointer font-medium text-violet-950 dark:text-violet-100">{t("projects:variables.use", "Projektvariablen verwenden")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">{t("projects:variables.useDescription", "VAR-Namen werden in Aufgaben erkannt. Feste Vorgaben und Werte je Projektdurchlauf können anschließend getrennt gepflegt werden.")}</p>
                  </div>
                </div>
              </div>

              <ProjectPhasesEditor phases={projectPhases} onChange={setProjectPhases} t={t} />

              <div className="space-y-2">
                <Label htmlFor="edit-status">{t("common:labels.status", "Status")}</Label>
                <Select value={projectStatus} onValueChange={(value: any) => setProjectStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{t("projects:status.planning", "Planung")}</SelectItem>
                    <SelectItem value="active">{t("projects:status.active", "Aktiv")}</SelectItem>
                    <SelectItem value="completed">{t("projects:status.completed", "Abgeschlossen")}</SelectItem>
                    <SelectItem value="cancelled">{t("projects:status.cancelled", "Abgebrochen")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">{t("common:labels.startDate", "Startdatum")}</Label>
                  <DatePickerInput
                    id="edit-startDate"
                    value={projectStartDate}
                    onChange={(val) => setProjectStartDate(val)}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">{t("common:labels.endDate", "Enddatum")}</Label>
                  <DatePickerInput
                    id="edit-endDate"
                    value={projectEndDate}
                    onChange={(val) => setProjectEndDate(val)}
                    />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t("common:actions.cancel", "Abbrechen")}
              </Button>
              <Button onClick={handleUpdateProject}>
                {t("common:actions.save", "Speichern")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <TaskDetailDialog
        open={isTaskDetailDialogOpen}
        onOpenChange={setIsTaskDetailDialogOpen}
        task={selectedTask}
        members={members.map(m => ({ memberId: m.id, memberName: m.memberName }))}
        onTaskUpdated={(updatedTask) => {
          // Receive updated task directly from dialog
          setSelectedTask(updatedTask);
        }}
        onNavigateToTask={(taskId) => {
          const targetTask = projectTasks.find(t => t.id === taskId);
          if (targetTask) {
            setSelectedTask(targetTask);
          }
        }}
      />

      {completeDialogOpen && selectedTask && (
        <CompleteTaskDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          task={selectedTask}
          onComplete={handleCompleteTask}
        />
      )}

      <MilestoneDialog
        open={milestoneDialogOpen && !!selectedTask}
        onOpenChange={setMilestoneDialogOpen}
        task={selectedTask}
        onAddMilestone={async (data) => {
          if (selectedTask) {
            await milestoneMutation.mutateAsync({
              taskId: selectedTask.id,
              householdId: household!.householdId,
              memberId: member!.memberId,
              comment: data.comment,
              photoUrls: data.photoUrls,
              fileUrls: data.fileUrls,
            });
          }
        }}
      />

      <ReminderDialog
        key={`reminder-${selectedTask?.id || 'none'}`}
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        task={selectedTask ? {
          ...selectedTask,
          assignedTo: selectedTask.assignedTo && selectedTask.assignedTo.length > 0
            ? selectedTask.assignedTo.map((id: number) => members.find(m => m.id === id)?.memberName).filter(Boolean).join(", ")
            : undefined,
        } : null}
        onSendReminder={async (data) => {
          if (selectedTask) {
            await reminderMutation.mutateAsync({
              taskId: selectedTask.id,
              householdId: household!.householdId,
              memberId: member!.memberId,
              comment: data.comment,
            });
          }
        }}
      />
      <BottomNav />
    </AppLayout>
  );
}

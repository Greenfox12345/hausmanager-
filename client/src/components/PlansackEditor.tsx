/**
 * PlansackEditor – Vollständige Bearbeitung eines Plansack-Snapshots.
 * Ermöglicht das Bearbeiten von Name, Beschreibung, Einkaufsartikeln,
 * Aufgaben (mit Phasen und Abhängigkeiten) und Variablen direkt im Snapshot.
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Save, ShoppingCart, CheckSquare, Layers,
  ChevronDown, ChevronUp, X, GripVertical, Palette
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PlanBagSnapshot } from "../../../drizzle/schema";

// ─── Typen ────────────────────────────────────────────────────────────────────
type SnapshotShoppingItem = NonNullable<PlanBagSnapshot["shoppingItems"]>[number];
type SnapshotTaskItem = NonNullable<PlanBagSnapshot["taskItems"]>[number];
type SnapshotPhase = NonNullable<PlanBagSnapshot["phases"]>[number];

const PHASE_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#ec4899","#06b6d4","#84cc16","#f97316","#6366f1","#14b8a6","#a855f7",
];

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function generateId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Einkaufsartikel-Dialog ───────────────────────────────────────────────────
function ShoppingItemDialog({
  item, phases, onSave, onClose,
}: {
  item: Partial<SnapshotShoppingItem> | null;
  phases: SnapshotPhase[];
  onSave: (item: SnapshotShoppingItem) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(["plankiste", "common"]);
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [phaseId, setPhaseId] = useState(item?.phaseId ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      quantity: quantity || null,
      unitSymbol: item?.unitSymbol ?? null,
      unitName: item?.unitName ?? null,
      notes: notes || null,
      categoryName: item?.categoryName ?? null,
      categoryColor: item?.categoryColor ?? null,
      phaseId: phaseId || null,
      sortOrder: item?.sortOrder ?? 0,
    });
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.name ? t("plankiste:items.edit", "Artikel bearbeiten") : t("plankiste:items.add", "Artikel hinzufügen")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("plankiste:items.name", "Name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("plankiste:items.namePlaceholder", "z.B. Mehl")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("plankiste:items.quantity", "Menge")}</Label>
            <Input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="z.B. 500g oder VARMenge" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("plankiste:items.notes", "Notiz")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          {phases.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("plankiste:phases.phase", "Phase")}</Label>
              <Select value={phaseId || "__none__"} onValueChange={v => setPhaseId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("plankiste:phases.noPhase", "Keine Phase")}</SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common:cancel", "Abbrechen")}</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{t("common:save", "Speichern")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aufgaben-Dialog ──────────────────────────────────────────────────────────
function TaskItemDialog({
  task, allTasks, phases, onSave, onClose,
}: {
  task: Partial<SnapshotTaskItem> | null;
  allTasks: SnapshotTaskItem[];
  phases: SnapshotPhase[];
  onSave: (task: SnapshotTaskItem) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(["plankiste", "common"]);
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [phaseId, setPhaseId] = useState(task?.phaseId ?? "");
  const [frequency, setFrequency] = useState(task?.frequency ?? "once");
  const [repeatInterval, setRepeatInterval] = useState(String(task?.repeatInterval ?? ""));
  const [repeatUnit, setRepeatUnit] = useState(task?.repeatUnit ?? "days");
  const [dueDaysFromStart, setDueDaysFromStart] = useState(String(task?.dueDaysFromStart ?? ""));
  const [prereqNames, setPrereqNames] = useState<string[]>(task?.prerequisiteNames ?? []);
  const [followupNames, setFollowupNames] = useState<string[]>(task?.followupNames ?? []);

  const otherTasks = allTasks.filter(t => t.name !== task?.name);

  const togglePrereq = (name: string) => {
    setPrereqNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };
  const toggleFollowup = (name: string) => {
    setFollowupNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description || null,
      dueDaysFromStart: dueDaysFromStart ? Number(dueDaysFromStart) : null,
      frequency: frequency as any,
      customFrequencyDays: null,
      repeatInterval: repeatInterval ? Number(repeatInterval) : null,
      repeatUnit: repeatUnit as any,
      durationDays: task?.durationDays ?? 0,
      durationMinutes: task?.durationMinutes ?? 0,
      enableRotation: task?.enableRotation ?? false,
      requiredPersons: task?.requiredPersons ?? null,
      prerequisiteNames: prereqNames,
      followupNames: followupNames,
      gapDaysMap: task?.gapDaysMap ?? {},
      phaseId: phaseId || null,
      sortOrder: task?.sortOrder ?? 0,
    });
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?.name ? t("plankiste:taskForm.editTask", "Aufgabe bearbeiten") : t("plankiste:taskForm.addTask", "Aufgabe hinzufügen")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("plankiste:taskForm.name", "Name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("plankiste:taskForm.description", "Beschreibung")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("plankiste:taskForm.frequency", "Wiederholung")}</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t("plankiste:taskForm.once", "Einmalig")}</SelectItem>
                  <SelectItem value="daily">{t("plankiste:taskForm.daily", "Täglich")}</SelectItem>
                  <SelectItem value="weekly">{t("plankiste:taskForm.weekly", "Wöchentlich")}</SelectItem>
                  <SelectItem value="monthly">{t("plankiste:taskForm.monthly", "Monatlich")}</SelectItem>
                  <SelectItem value="custom">{t("plankiste:taskForm.custom", "Benutzerdefiniert")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "custom" && (
              <div className="space-y-1.5">
                <Label>{t("plankiste:taskForm.interval", "Intervall (Tage)")}</Label>
                <Input type="number" min="1" value={repeatInterval} onChange={e => setRepeatInterval(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("plankiste:taskForm.dueDays", "Fällig nach (Tage)")}</Label>
              <Input type="number" min="0" value={dueDaysFromStart} onChange={e => setDueDaysFromStart(e.target.value)} placeholder="0" />
            </div>
          </div>
          {phases.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("plankiste:phases.phase", "Phase")}</Label>
              <Select value={phaseId || "__none__"} onValueChange={v => setPhaseId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("plankiste:phases.noPhase", "Keine Phase")}</SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {otherTasks.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("plankiste:taskForm.prerequisites", "Voraussetzungen")}</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {otherTasks.map(ot => (
                    <label key={ot.name} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={prereqNames.includes(ot.name)} onChange={() => togglePrereq(ot.name)} />
                      <span className="truncate">{ot.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("plankiste:taskForm.followups", "Folgeaufgaben")}</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {otherTasks.map(ot => (
                    <label key={ot.name} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={followupNames.includes(ot.name)} onChange={() => toggleFollowup(ot.name)} />
                      <span className="truncate">{ot.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common:cancel", "Abbrechen")}</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{t("common:save", "Speichern")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Phasen-Editor ────────────────────────────────────────────────────────────
function PhasesEditor({
  phases, onChange,
}: {
  phases: SnapshotPhase[];
  onChange: (phases: SnapshotPhase[]) => void;
}) {
  const { t } = useTranslation(["plankiste", "common"]);
  const [newPhaseName, setNewPhaseName] = useState("");

  const addPhase = () => {
    if (!newPhaseName.trim() || phases.length >= 12) return;
    const colorIdx = phases.length % PHASE_COLORS.length;
    onChange([...phases, { id: generateId(), name: newPhaseName.trim(), color: PHASE_COLORS[colorIdx], order: phases.length }]);
    setNewPhaseName("");
  };

  const removePhase = (id: string) => {
    onChange(phases.filter(p => p.id !== id));
  };

  const updateColor = (id: string, color: string) => {
    onChange(phases.map(p => p.id === id ? { ...p, color } : p));
  };

  const updateName = (id: string, name: string) => {
    onChange(phases.map(p => p.id === id ? { ...p, name } : p));
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {phases.map(phase => (
          <div key={phase.id} className="flex items-center gap-2 p-2 border rounded-lg">
            <input
              type="color"
              value={phase.color}
              onChange={e => updateColor(phase.id, e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              title={t("plankiste:phases.color", "Farbe")}
            />
            <Input
              value={phase.name}
              onChange={e => updateName(phase.id, e.target.value)}
              className="h-7 text-sm flex-1"
            />
            <button onClick={() => removePhase(phase.id)} className="text-destructive hover:text-destructive/80">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {phases.length < 12 && (
        <div className="flex gap-2">
          <Input
            value={newPhaseName}
            onChange={e => setNewPhaseName(e.target.value)}
            placeholder={t("plankiste:phases.newPhaseName", "Neue Phase...")}
            className="h-8 text-sm"
            onKeyDown={e => { if (e.key === "Enter") addPhase(); }}
          />
          <Button size="sm" variant="outline" onClick={addPhase} disabled={!newPhaseName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function PlansackEditor({
  bagItemId,
  initialSnapshot,
  onSaved,
}: {
  bagItemId: number;
  initialSnapshot: PlanBagSnapshot;
  onSaved?: () => void;
}) {
  const { t } = useTranslation(["plankiste", "common"]);
  const utils = trpc.useUtils();

  // Lokaler Draft-State des Snapshots
  const [draft, setDraft] = useState<PlanBagSnapshot>(() => ({
    ...initialSnapshot,
    shoppingItems: initialSnapshot.shoppingItems ?? [],
    taskItems: initialSnapshot.taskItems ?? [],
    phases: initialSnapshot.phases ?? [],
    variables: initialSnapshot.variables ?? [],
  }));
  const [dirty, setDirty] = useState(false);

  // Dialoge
  const [editShoppingItem, setEditShoppingItem] = useState<{ item: Partial<SnapshotShoppingItem>; idx: number } | null>(null);
  const [editTaskItem, setEditTaskItem] = useState<{ task: Partial<SnapshotTaskItem>; idx: number } | null>(null);
  const [showPhasesDialog, setShowPhasesDialog] = useState(false);
  const [activeSection, setActiveSection] = useState<"meta" | "shopping" | "tasks" | "phases" | "variables">("meta");

  const updateFull = trpc.planBag.updateFull.useMutation({
    onSuccess: () => {
      utils.planBag.listBag.invalidate();
      toast.success(t("common:saved", "Gespeichert"));
      setDirty(false);
      onSaved?.();
    },
    onError: () => toast.error(t("common:error", "Fehler beim Speichern")),
  });

  const update = useCallback((updater: (prev: PlanBagSnapshot) => PlanBagSnapshot) => {
    setDraft(prev => updater(prev));
    setDirty(true);
  }, []);

  const handleSave = () => {
    updateFull.mutate({ bagItemId, snapshot: draft });
  };

  // ─── Shopping Items ──────────────────────────────────────────────────────
  const saveShoppingItem = (item: SnapshotShoppingItem, idx: number) => {
    update(prev => {
      const items = [...(prev.shoppingItems ?? [])];
      if (idx === -1) {
        items.push({ ...item, sortOrder: items.length });
      } else {
        items[idx] = item;
      }
      return { ...prev, shoppingItems: items };
    });
    setEditShoppingItem(null);
  };

  const deleteShoppingItem = (idx: number) => {
    update(prev => ({
      ...prev,
      shoppingItems: (prev.shoppingItems ?? []).filter((_, i) => i !== idx),
    }));
  };

  // ─── Task Items ──────────────────────────────────────────────────────────
  const saveTaskItem = (task: SnapshotTaskItem, idx: number) => {
    update(prev => {
      const tasks = [...(prev.taskItems ?? [])];
      if (idx === -1) {
        tasks.push({ ...task, sortOrder: tasks.length });
      } else {
        tasks[idx] = task;
      }
      return { ...prev, taskItems: tasks };
    });
    setEditTaskItem(null);
  };

  const deleteTaskItem = (idx: number) => {
    const taskName = draft.taskItems?.[idx]?.name;
    update(prev => ({
      ...prev,
      taskItems: (prev.taskItems ?? [])
        .filter((_, i) => i !== idx)
        .map(t => ({
          ...t,
          prerequisiteNames: (t.prerequisiteNames ?? []).filter(n => n !== taskName),
          followupNames: (t.followupNames ?? []).filter(n => n !== taskName),
        })),
    }));
  };

  const phases = draft.phases ?? [];
  const shoppingItems = draft.shoppingItems ?? [];
  const taskItems = draft.taskItems ?? [];
  const variables = (draft.variables ?? []) as PlanVariable[];
  const enableVariables = draft.enableVariables ?? false;

  // Berechnete Variablen-Werte für Anzeige
  const evaluatedVarsRaw = evaluateAllVars(variables);
  const evalDisplay: Record<string, string> = {};
  for (const [name, ev] of Object.entries(evaluatedVarsRaw)) {
    const r = ev.result;
    if (r !== null && r !== undefined && typeof r !== "object") {
      evalDisplay[name] = String(r) + (ev.unit ? ` ${ev.unit}` : "");
    }
  }

  const getPhase = (id: string | null | undefined) => phases.find(p => p.id === id);

  return (
    <div className="space-y-4">
      {/* Speichern-Button */}
      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateFull.isPending} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {t("common:save", "Speichern")}
          </Button>
        </div>
      )}

      {/* ─── Abschnitt: Meta ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(s => s === "meta" ? "shopping" : "meta")}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>📝 {t("plankiste:templateForm.name", "Name & Beschreibung")}</span>
            {activeSection === "meta" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {activeSection === "meta" && (
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <Label>{t("plankiste:templateForm.name", "Name")} *</Label>
              <Input
                value={draft.name}
                onChange={e => update(prev => ({ ...prev, name: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("plankiste:templateForm.description", "Beschreibung")}</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={e => update(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─── Abschnitt: Phasen ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(s => s === "phases" ? "meta" : "phases")}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>🎨 {t("plankiste:phases.title", "Phasen")} ({phases.length})</span>
            {activeSection === "phases" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {activeSection === "phases" && (
          <CardContent className="pt-0">
            <PhasesEditor
              phases={phases}
              onChange={newPhases => update(prev => ({ ...prev, phases: newPhases }))}
            />
          </CardContent>
        )}
      </Card>

      {/* ─── Abschnitt: Variablen ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(s => s === "variables" ? "meta" : "variables")}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              🔢 {t("plankiste:variables.title", "Variablen")}
              {enableVariables && variables.length > 0 && (
                <span className="text-xs text-violet-600 font-normal">({variables.length})</span>
              )}
            </span>
            {activeSection === "variables" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {activeSection === "variables" && (
          <CardContent className="pt-0">
            <PlansackVariablesPanel
              snapshot={draft}
              onChange={(updatedVars, newEnableVariables) => {
                update(prev => ({ ...prev, variables: updatedVars, enableVariables: newEnableVariables }));
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* ─── Abschnitt: Einkaufsartikel ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(s => s === "shopping" ? "meta" : "shopping")}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              {t("plankiste:items.title", "Einkaufsartikel")} ({shoppingItems.length})
            </span>
            {activeSection === "shopping" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {activeSection === "shopping" && (
          <CardContent className="pt-0 space-y-2">
            {shoppingItems.map((item, idx) => {
              const phase = getPhase(item.phaseId);
              return (
                <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
                  {phase && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">
                      {enableVariables ? <VarText text={item.name} variables={variables} /> : item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {enableVariables ? <VarText text={item.quantity} variables={variables} /> : item.quantity}
                      </span>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground truncate">
                        {enableVariables ? <VarText text={item.notes} variables={variables} /> : item.notes}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setEditShoppingItem({ item, idx })} className="text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteShoppingItem(idx)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setEditShoppingItem({ item: {}, idx: -1 })}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t("plankiste:items.add", "Artikel hinzufügen")}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* ─── Abschnitt: Aufgaben ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(s => s === "tasks" ? "meta" : "tasks")}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              {t("plankiste:taskItems.title", "Aufgaben")} ({taskItems.length})
            </span>
            {activeSection === "tasks" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {activeSection === "tasks" && (
          <CardContent className="pt-0 space-y-2">
            {taskItems.map((task, idx) => {
              const phase = getPhase(task.phaseId);
              return (
                <div key={idx} className="flex items-start gap-2 p-2 border rounded-lg text-sm">
                  {phase && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: phase.color }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block">
                      {enableVariables ? <VarText text={task.name} variables={variables} /> : task.name}
                    </span>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {enableVariables ? <VarText text={task.description} variables={variables} /> : task.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {task.frequency && task.frequency !== "once" && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">{task.frequency}</Badge>
                      )}
                      {(task.prerequisiteNames ?? []).length > 0 && (
                        <span className="text-xs text-muted-foreground">→ {(task.prerequisiteNames ?? []).length} Voraussetzung(en)</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setEditTaskItem({ task, idx })} className="text-muted-foreground hover:text-foreground mt-0.5">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTaskItem(idx)} className="text-destructive hover:text-destructive/80 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setEditTaskItem({ task: {}, idx: -1 })}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t("plankiste:taskItems.add", "Aufgabe hinzufügen")}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* ─── Dialoge ──────────────────────────────────────────────── */}
      {editShoppingItem && (
        <ShoppingItemDialog
          item={editShoppingItem.item}
          phases={phases}
          onSave={item => saveShoppingItem(item, editShoppingItem.idx)}
          onClose={() => setEditShoppingItem(null)}
        />
      )}
      {editTaskItem && (
        <TaskItemDialog
          task={editTaskItem.task}
          allTasks={taskItems}
          phases={phases}
          onSave={task => saveTaskItem(task, editTaskItem.idx)}
          onClose={() => setEditTaskItem(null)}
        />
      )}
    </div>
  );
}
import { PlansackVariablesPanel } from "@/components/PlansackVariablesPanel";
import { VarText } from "@/components/VarToken";
import { evaluateAllVars, type PlanVariable } from "@/lib/varParser";

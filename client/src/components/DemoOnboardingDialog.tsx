/**
 * DemoOnboardingDialog
 *
 * Shown immediately after a user registers and claims a demo household.
 * Allows them to:
 *  1. Rename the household
 *  2. Review tasks (grouped by project, multi-project tasks highlighted in amber)
 *     and select which ones to delete
 *  3. Review shopping items (grouped by category) and select which ones to delete
 *  4. Manage demo members (rename or remove)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Home,
  Trash2,
  Users,
  CheckSquare,
  Pencil,
  X,
  Check,
  AlertTriangle,
  ShoppingCart,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingTask {
  id: number;
  name: string;
  description: string | null;
  projectIds: number[];
  projectNames: string[];
  isDuplicated: boolean;
  dueDate: string | null;
}

interface OnboardingShoppingItem {
  id: number;
  name: string;
  details: string | null;
  isCompleted: boolean;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
}

interface MemberState {
  action: "keep" | "rename" | "remove";
  newName: string;
  editing: boolean;
}

interface Props {
  open: boolean;
  householdId: number;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoOnboardingDialog({ open, householdId, onClose }: Props) {
  const { setCurrentHousehold, currentHousehold } = useUserAuth();

  // ── Server data ──────────────────────────────────────────────────────────
  const { data, isLoading } = trpc.demo.getOnboardingData.useQuery(
    { householdId },
    { enabled: open && householdId > 0 }
  );

  // ── Local state ──────────────────────────────────────────────────────────
  const [householdName, setHouseholdName] = useState("");
  const [deleteTaskIds, setDeleteTaskIds] = useState<Set<number>>(new Set());
  const [deleteShoppingIds, setDeleteShoppingIds] = useState<Set<number>>(new Set());
  const [memberStates, setMemberStates] = useState<Map<number, MemberState>>(new Map());

  // Sync household name from server once loaded
  useMemo(() => {
    if (data?.householdName && !householdName) {
      setHouseholdName(data.householdName);
    }
  }, [data?.householdName]);

  // Sync member states from server once loaded
  useMemo(() => {
    if (data?.members) {
      const map = new Map<number, MemberState>();
      for (const m of data.members) {
        if (!memberStates.has(m.id)) {
          map.set(m.id, { action: "keep", newName: m.memberName, editing: false });
        } else {
          map.set(m.id, memberStates.get(m.id)!);
        }
      }
      setMemberStates(map);
    }
  }, [data?.members]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const applyMutation = trpc.demo.applyOnboarding.useMutation({
    onSuccess: () => {
      if (currentHousehold) {
        setCurrentHousehold({ ...currentHousehold, householdName });
      }
      toast.success("Haushalt erfolgreich eingerichtet!");
      onClose();
    },
    onError: (err) => {
      toast.error("Fehler beim Speichern: " + err.message);
    },
  });

  // ── Task helpers ─────────────────────────────────────────────────────────

  function toggleTask(id: number) {
    setDeleteTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllTasks() {
    if (data?.tasks) setDeleteTaskIds(new Set(data.tasks.map((t) => t.id)));
  }

  function deselectAllTasks() {
    setDeleteTaskIds(new Set());
  }

  // ── Shopping helpers ─────────────────────────────────────────────────────

  function toggleShoppingItem(id: number) {
    setDeleteShoppingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllShopping() {
    if (data?.shoppingItems) setDeleteShoppingIds(new Set(data.shoppingItems.map((i) => i.id)));
  }

  function deselectAllShopping() {
    setDeleteShoppingIds(new Set());
  }

  // ── Member helpers ───────────────────────────────────────────────────────

  function setMemberAction(id: number, action: MemberState["action"]) {
    setMemberStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { action: "keep", newName: "", editing: false };
      next.set(id, { ...cur, action, editing: action === "rename" });
      return next;
    });
  }

  function setMemberName(id: number, name: string) {
    setMemberStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { action: "rename", newName: name, editing: true };
      next.set(id, { ...cur, newName: name });
      return next;
    });
  }

  function confirmRename(id: number) {
    setMemberStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (cur) next.set(id, { ...cur, editing: false });
      return next;
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!householdName.trim()) {
      toast.error("Bitte gib einen Haushaltsnamen ein.");
      return;
    }

    const members = Array.from(memberStates.entries()).map(([id, s]) => ({
      id,
      action: s.action,
      newName: s.newName || undefined,
    }));

    applyMutation.mutate({
      householdId,
      householdName: householdName.trim(),
      deleteTaskIds: Array.from(deleteTaskIds),
      deleteShoppingItemIds: Array.from(deleteShoppingIds),
      members,
    });
  }

  // ── Grouped tasks ────────────────────────────────────────────────────────
  const groupedTasks = useMemo(() => {
    if (!data?.tasks) return [];
    const groups = new Map<string, OnboardingTask[]>();
    const noProject: OnboardingTask[] = [];

    for (const task of data.tasks) {
      if (task.projectNames.length === 0) {
        noProject.push(task);
      } else {
        const key = task.projectNames[0];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(task);
      }
    }

    const result: { label: string; tasks: OnboardingTask[] }[] = [];
    groups.forEach((tasks, label) => result.push({ label, tasks }));
    if (noProject.length > 0) result.push({ label: "Ohne Projekt", tasks: noProject });
    return result;
  }, [data?.tasks]);

  // ── Grouped shopping items ────────────────────────────────────────────────
  const groupedShopping = useMemo(() => {
    if (!data?.shoppingItems) return [];
    const groups = new Map<string, { color: string; items: OnboardingShoppingItem[] }>();

    for (const item of data.shoppingItems) {
      const key = item.categoryName;
      if (!groups.has(key)) groups.set(key, { color: item.categoryColor, items: [] });
      groups.get(key)!.items.push(item);
    }

    const result: { label: string; color: string; items: OnboardingShoppingItem[] }[] = [];
    groups.forEach(({ color, items }, label) => result.push({ label, color, items }));
    return result;
  }, [data?.shoppingItems]);

  const demoMembers = useMemo(
    () => (data?.members ?? []).filter((m) => !m.isOwner),
    [data?.members]
  );

  const totalShopping = data?.shoppingItems?.length ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Haushalt einrichten</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Passe deinen übernommenen Haushalt an, bevor du loslegst.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Daten werden geladen…
          </div>
        ) : (
          <Tabs defaultValue="household" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Horizontal-scrollable tab bar so all 4 tabs are always reachable on small screens */}
            <div className="px-6 mt-4 mb-0 shrink-0 overflow-x-auto">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="household" className="gap-1.5">
                <Home className="h-3.5 w-3.5" />
                Haushalt
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                Aufgaben
                {deleteTaskIds.size > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {deleteTaskIds.size}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="shopping" className="gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Einkaufsliste
                {deleteShoppingIds.size > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {deleteShoppingIds.size}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Mitglieder
              </TabsTrigger>
            </TabsList>
            </div>

            {/* ── Tab: Haushalt ── */}
            <TabsContent value="household" className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hhname">Haushaltsname</Label>
                  <Input
                    id="hhname"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="z.B. Familie Müller"
                    className="max-w-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gib deinem Haushalt einen persönlichen Namen.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab: Aufgaben ── */}
            <TabsContent value="tasks" className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Wähle Aufgaben aus, die du <strong>löschen</strong> möchtest. Alle anderen bleiben erhalten.
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={selectAllTasks} className="text-xs h-7">
                    Alle wählen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTasks} className="text-xs h-7">
                    Keine
                  </Button>
                </div>
              </div>

              {data?.tasks && data.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Keine Aufgaben vorhanden.</p>
              ) : (
                <ScrollArea className="flex-1 -mx-1 px-1">
                  <div className="space-y-4">
                    {groupedTasks.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                          {group.label}
                        </p>
                        <div className="space-y-1">
                          {group.tasks.map((task) => (
                            <label
                              key={task.id}
                              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors select-none ${
                                deleteTaskIds.has(task.id)
                                  ? "bg-red-50 border-red-200"
                                  : task.isDuplicated
                                    ? "bg-amber-50 border-amber-200"
                                    : "hover:bg-muted/50 border-transparent"
                              }`}
                            >
                              <Checkbox
                                checked={deleteTaskIds.has(task.id)}
                                onCheckedChange={() => toggleTask(task.id)}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${deleteTaskIds.has(task.id) ? "line-through text-muted-foreground" : ""}`}>
                                    {task.name}
                                  </span>
                                  {task.isDuplicated && (
                                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] h-4 px-1 gap-0.5">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      Mehrere Projekte
                                    </Badge>
                                  )}
                                  {task.projectNames.slice(1).map((pn) => (
                                    <Badge key={pn} variant="secondary" className="text-[10px] h-4 px-1">
                                      {pn}
                                    </Badge>
                                  ))}
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                                )}
                              </div>
                              {deleteTaskIds.has(task.id) && (
                                <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {deleteTaskIds.size > 0 && (
                <p className="text-xs text-red-600 mt-2">
                  {deleteTaskIds.size} Aufgabe{deleteTaskIds.size !== 1 ? "n" : ""} wird gelöscht.
                </p>
              )}
            </TabsContent>

            {/* ── Tab: Einkaufsliste ── */}
            <TabsContent value="shopping" className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Wähle Einträge aus, die du <strong>löschen</strong> möchtest. Alle anderen bleiben erhalten.
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={selectAllShopping} className="text-xs h-7">
                    Alle wählen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllShopping} className="text-xs h-7">
                    Keine
                  </Button>
                </div>
              </div>

              {totalShopping === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Keine Einträge vorhanden.</p>
              ) : (
                <ScrollArea className="flex-1 -mx-1 px-1">
                  <div className="space-y-4">
                    {groupedShopping.map((group) => (
                      <div key={group.label}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <label
                              key={item.id}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors select-none ${
                                deleteShoppingIds.has(item.id)
                                  ? "bg-red-50 border-red-200"
                                  : "hover:bg-muted/50 border-transparent"
                              }`}
                            >
                              <Checkbox
                                checked={deleteShoppingIds.has(item.id)}
                                onCheckedChange={() => toggleShoppingItem(item.id)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${deleteShoppingIds.has(item.id) ? "line-through text-muted-foreground" : item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                  {item.name}
                                </span>
                                {item.details && (
                                  <span className="text-xs text-muted-foreground ml-2">{item.details}</span>
                                )}
                              </div>
                              {item.isCompleted && !deleteShoppingIds.has(item.id) && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                                  Erledigt
                                </Badge>
                              )}
                              {deleteShoppingIds.has(item.id) && (
                                <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {deleteShoppingIds.size > 0 && (
                <p className="text-xs text-red-600 mt-2">
                  {deleteShoppingIds.size} Eintrag{deleteShoppingIds.size !== 1 ? "einträge" : ""} wird gelöscht.
                </p>
              )}
            </TabsContent>

            {/* ── Tab: Mitglieder ── */}
            <TabsContent value="members" className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Diese Demo-Mitglieder wurden automatisch angelegt. Du kannst sie umbenennen oder entfernen.
              </p>
              <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-2">
                  {/* Owner row */}
                  {data?.members.filter((m) => m.isOwner).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                      <div className="h-7 w-7 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold text-blue-800">
                        {m.memberName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium flex-1">{m.memberName}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700">
                        Du (Inhaber)
                      </Badge>
                    </div>
                  ))}

                  <Separator className="my-1" />

                  {demoMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Keine weiteren Mitglieder.</p>
                  )}

                  {demoMembers.map((m) => {
                    const state = memberStates.get(m.id) ?? { action: "keep", newName: m.memberName, editing: false };
                    const isRemoved = state.action === "remove";
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          isRemoved ? "bg-red-50 border-red-200 opacity-60" : "border-border"
                        }`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${isRemoved ? "bg-red-100 text-red-500" : "bg-muted text-muted-foreground"}`}>
                          {m.memberName.charAt(0).toUpperCase()}
                        </div>

                        {state.editing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={state.newName}
                              onChange={(e) => setMemberName(m.id, e.target.value)}
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && confirmRename(m.id)}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => confirmRename(m.id)}>
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          </div>
                        ) : (
                          <span className={`text-sm flex-1 ${isRemoved ? "line-through text-muted-foreground" : ""}`}>
                            {state.action === "rename" ? state.newName : m.memberName}
                          </span>
                        )}

                        {!state.editing && (
                          <div className="flex gap-1 shrink-0">
                            {!isRemoved && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Umbenennen"
                                onClick={() => setMemberAction(m.id, "rename")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isRemoved ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Wiederherstellen"
                                onClick={() => setMemberAction(m.id, "keep")}
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                title="Entfernen"
                                onClick={() => setMemberAction(m.id, "remove")}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer – always visible */}
        <DialogFooter className="px-6 py-4 border-t flex-row justify-between items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={applyMutation.isPending}>
            Überspringen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || applyMutation.isPending || !householdName.trim()}
            className="gap-2"
          >
            {applyMutation.isPending ? "Wird gespeichert…" : "Haushalt einrichten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Plankiste – Vorlagen für wiederkehrende Einkäufe, Aufgaben und Projekte
 *
 * Struktur:
 * - Tab "Vorlagen": Alle Vorlagen anzeigen, neue erstellen, bearbeiten, starten
 * - Tab "Aktive Pläne": Gestartete Instanzen mit Übertragungsfunktion
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
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
  Plus, Trash2, Edit2, Play, BookOpen, ShoppingCart, CheckSquare,
  FolderKanban, ChevronRight, Archive, MoreVertical, Package,
  ArrowRight, Check, X, ListChecks, Layers
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { QuantityInput, formatQuantityWithUnit, type UnitOption } from "@/components/QuantityInput";
import PageHeader from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

// ─── Typen ────────────────────────────────────────────────────────────────────
type TemplateType = "shopping" | "tasks" | "project" | "mixed";

const TYPE_LABELS: Record<TemplateType, string> = {
  shopping: "Einkaufsliste",
  tasks: "Aufgaben",
  project: "Projekt",
  mixed: "Gemischt",
};

const TYPE_ICONS: Record<TemplateType, React.ElementType> = {
  shopping: ShoppingCart,
  tasks: CheckSquare,
  project: FolderKanban,
  mixed: Layers,
};

const TYPE_COLORS: Record<TemplateType, string> = {
  shopping: "bg-green-100 text-green-700",
  tasks: "bg-blue-100 text-blue-700",
  project: "bg-purple-100 text-purple-700",
  mixed: "bg-orange-100 text-orange-700",
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function Plankiste() {
  const { t } = useTranslation(["common"]);
  const [, setLocation] = useLocation();
  const { household, member } = useCompatAuth();
  const householdId = household?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;

  const [activeTab, setActiveTab] = useState<"templates" | "instances">("templates");

  if (!householdId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Kein Haushalt ausgewählt
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <PageHeader
          icon={BookOpen}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          title="Plankiste"
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "templates"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("templates")}
          >
            Vorlagen
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "instances"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("instances")}
          >
            Aktive Pläne
          </button>
        </div>

        {activeTab === "templates" ? (
          <TemplatesTab householdId={householdId} memberId={memberId} />
        ) : (
          <InstancesTab householdId={householdId} memberId={memberId} />
        )}
      </div>
      <BottomNav />
    </AppLayout>
  );
}

// ─── Vorlagen-Tab ─────────────────────────────────────────────────────────────
function TemplatesTab({ householdId, memberId }: { householdId: number; memberId: number }) {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const { data: templates = [], isLoading } = trpc.planTemplates.listTemplates.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const archiveMutation = trpc.planTemplates.archiveTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success("Vorlage archiviert");
    },
    onError: () => toast.error("Fehler beim Archivieren"),
  });

  const startMutation = trpc.planTemplates.startTemplate.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success(`Plan „${data.label}" gestartet`);
    },
    onError: () => toast.error("Fehler beim Starten"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Neue Vorlage erstellen */}
      <Button
        className="w-full"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Neue Vorlage erstellen
      </Button>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Noch keine Vorlagen</p>
          <p className="text-sm mt-1">Erstelle eine Vorlage für wiederkehrende Einkäufe oder Aufgaben</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const TypeIcon = TYPE_ICONS[template.type as TemplateType] ?? ShoppingCart;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTemplateId(
                  selectedTemplateId === template.id ? null : template.id
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                        <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[template.type as TemplateType]}`}>
                          {TYPE_LABELS[template.type as TemplateType]}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{template.itemCount} Artikel</span>
                        {template.usageCount > 0 && (
                          <span>{template.usageCount}× gestartet</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => startMutation.mutate({ templateId: template.id, householdId, memberId })}
                        disabled={startMutation.isPending}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Starten
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => archiveMutation.mutate({ templateId: template.id, householdId, memberId })}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archivieren
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Aufklappbare Artikelliste */}
                  {selectedTemplateId === template.id && (
                    <TemplateItemsPreview templateId={template.id} householdId={householdId} memberId={memberId} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vorlage erstellen/bearbeiten Dialog */}
      <TemplateFormDialog
        open={showCreateDialog || !!editingTemplate}
        onClose={() => { setShowCreateDialog(false); setEditingTemplate(null); }}
        householdId={householdId}
        memberId={memberId}
        template={editingTemplate}
      />
    </div>
  );
}

// ─── Vorlagen-Artikel-Vorschau (aufklappbar) ──────────────────────────────────
function TemplateItemsPreview({
  templateId, householdId, memberId
}: { templateId: number; householdId: number; memberId: number }) {
  const utils = trpc.useUtils();
  const [itemTab, setItemTab] = useState<"shopping" | "tasks">("shopping");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState<number | null>(null);
  const [newItemUnitId, setNewItemUnitId] = useState<number | null>(null);
  const [newItemCategoryId, setNewItemCategoryId] = useState<number | null>(null);
  const [newItemNotes, setNewItemNotes] = useState("");
  // Inline-Bearbeitung
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState<number | null>(null);
  const [editUnitId, setEditUnitId] = useState<number | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const { data: template } = trpc.planTemplates.getTemplate.useQuery(
    { templateId },
    { enabled: templateId > 0 }
  );
  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );
  const { data: units = [] } = trpc.units.list.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const addItemMutation = trpc.planTemplates.addTemplateItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
      setNewItemName(""); setNewItemQty(null); setNewItemUnitId(null); setNewItemCategoryId(null);
      setShowAddItem(false);
      toast.success("Artikel hinzugefügt");
    },
    onError: () => toast.error("Fehler beim Hinzufügen"),
  });

  const deleteItemMutation = trpc.planTemplates.deleteTemplateItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
      toast.success("Artikel entfernt");
    },
    onError: () => toast.error("Fehler beim Entfernen"),
  });

  const updateItemMutation = trpc.planTemplates.updateTemplateItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
      setEditingItemId(null);
      toast.success("Artikel aktualisiert");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditQty(item.quantity ?? null);
    setEditUnitId(item.unitId ?? null);
    setEditCategoryId(item.categoryId ?? null);
    setEditNotes(item.notes ?? "");
  };

  const unitOptions: UnitOption[] = (units as any[]).map((u: any) => ({
    id: u.id, name: u.name, symbol: u.symbol
  }));

  const items = template?.items ?? [];
  const templateType = template?.type as TemplateType | undefined;
  const showTaskTab = templateType === 'tasks' || templateType === 'mixed';
  const showShoppingTab = templateType !== 'tasks';

  return (
    <div className="mt-4 pt-4 border-t border-border" onClick={e => e.stopPropagation()}>
      {/* Tab-Switch für gemischte/Aufgaben-Vorlagen */}
      {showTaskTab && showShoppingTab && (
        <div className="flex gap-1 bg-muted rounded-md p-0.5 mb-3">
          <button
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${itemTab === 'shopping' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setItemTab('shopping')}
          >
            <ShoppingCart className="w-3 h-3 inline mr-1" />
            Einkaufsartikel
          </button>
          <button
            className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${itemTab === 'tasks' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setItemTab('tasks')}
          >
            <CheckSquare className="w-3 h-3 inline mr-1" />
            Aufgaben
          </button>
        </div>
      )}
      {/* Aufgaben-Section */}
      {showTaskTab && (itemTab === 'tasks' || !showShoppingTab) && (
        <TemplateTaskItemsSection templateId={templateId} householdId={householdId} memberId={memberId} />
      )}
      {/* Einkaufsartikel-Section */}
      {showShoppingTab && (itemTab === 'shopping' || !showTaskTab) && (
      <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {items.length === 0 ? "Noch keine Artikel" : `${items.length} Artikel`}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setShowAddItem(!showAddItem)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Artikel hinzufügen
        </Button>
      </div>

      {/* Artikel hinzufügen Formular */}
      {showAddItem && (
        <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
          <Input
            placeholder="Artikelname"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            className="h-8 text-sm"
          />
          <Textarea
            placeholder="Notiz (optional)"
            value={newItemNotes}
            onChange={e => setNewItemNotes(e.target.value)}
            className="text-sm resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <QuantityInput
                value={newItemQty}
                onChange={setNewItemQty}
                unitId={newItemUnitId}
                onUnitChange={setNewItemUnitId}
                units={unitOptions}
              />
            </div>
            <Select
              value={newItemCategoryId?.toString() ?? "none"}
              onValueChange={v => setNewItemCategoryId(v === "none" ? null : Number(v))}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Kategorie</SelectItem>
                {(categories as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              disabled={!newItemName.trim() || addItemMutation.isPending}
              onClick={() => addItemMutation.mutate({
                templateId,
                name: newItemName.trim(),
                categoryId: newItemCategoryId,
                quantity: newItemQty,
                unitId: newItemUnitId,
                notes: newItemNotes.trim() || undefined,
              })}
            >
              Hinzufügen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowAddItem(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Artikelliste */}
      <div className="space-y-1.5">
        {items.map((item: any) => {
          const unit = item.unitId ? { id: item.unitId, name: item.unitName, symbol: item.unitSymbol } : null;
          const isEditing = editingItemId === item.id;
          return (
            <div key={item.id}>
              {isEditing ? (
                /* Inline-Edit-Modus */
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Artikelname"
                  />
                  <Textarea
                    placeholder="Notiz (optional)"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <QuantityInput
                        value={editQty}
                        onChange={setEditQty}
                        unitId={editUnitId}
                        onUnitChange={setEditUnitId}
                        units={unitOptions}
                      />
                    </div>
                    <Select
                      value={editCategoryId?.toString() ?? "none"}
                      onValueChange={v => setEditCategoryId(v === "none" ? null : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Kategorie</SelectItem>
                        {(categories as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={!editName.trim() || updateItemMutation.isPending}
                      onClick={() => updateItemMutation.mutate({
                        itemId: item.id,
                        name: editName.trim(),
                        categoryId: editCategoryId,
                        quantity: editQty,
                        unitId: editUnitId,
                        notes: editNotes.trim() || null,
                      })}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingItemId(null)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normale Anzeige */
                <div className="flex items-start gap-2 py-1">
                  {item.categoryColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: item.categoryColor }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{item.name}</span>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  {item.quantity && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {formatQuantityWithUnit(item.quantity, unit)}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => startEditItem(item)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteItemMutation.mutate({ itemId: item.id })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      )}
    </div>
  );
}

// ─── Aufgaben-Template-Items Section ─────────────────────────────────────────
function TemplateTaskItemsSection({
  templateId, householdId, memberId
}: { templateId: number; householdId: number; memberId: number }) {
  const utils = trpc.useUtils();
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  // Neu-Formular State
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDueDays, setNewTaskDueDays] = useState<string>("");
  const [newTaskFreq, setNewTaskFreq] = useState<"once"|"daily"|"weekly"|"monthly"|"custom">("once");
  const [newTaskRepeatInterval, setNewTaskRepeatInterval] = useState("1");
  const [newTaskRepeatUnit, setNewTaskRepeatUnit] = useState<"days"|"weeks"|"months">("weeks");
  const [newTaskDurationDays, setNewTaskDurationDays] = useState("");
  const [newTaskDurationMinutes, setNewTaskDurationMinutes] = useState("");
  const [newTaskEnableRotation, setNewTaskEnableRotation] = useState(false);
  const [newTaskRequiredPersons, setNewTaskRequiredPersons] = useState("1");
  const [newTaskAssigned, setNewTaskAssigned] = useState<number[]>([]);
  const [newTaskPrereqs, setNewTaskPrereqs] = useState<number[]>([]);
  const [newTaskFollowups, setNewTaskFollowups] = useState<number[]>([]);
  // Bearbeiten-Formular State
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskDueDays, setEditTaskDueDays] = useState<string>("");
  const [editTaskFreq, setEditTaskFreq] = useState<"once"|"daily"|"weekly"|"monthly"|"custom">("once");
  const [editTaskRepeatInterval, setEditTaskRepeatInterval] = useState("1");
  const [editTaskRepeatUnit, setEditTaskRepeatUnit] = useState<"days"|"weeks"|"months">("weeks");
  const [editTaskDurationDays, setEditTaskDurationDays] = useState("");
  const [editTaskDurationMinutes, setEditTaskDurationMinutes] = useState("");
  const [editTaskEnableRotation, setEditTaskEnableRotation] = useState(false);
  const [editTaskRequiredPersons, setEditTaskRequiredPersons] = useState("1");
  const [editTaskAssigned, setEditTaskAssigned] = useState<number[]>([]);
  const [editTaskPrereqs, setEditTaskPrereqs] = useState<number[]>([]);
  const [editTaskFollowups, setEditTaskFollowups] = useState<number[]>([]);

  const { data: taskItems = [] } = trpc.planTemplates.listTemplateTaskItems.useQuery(
    { templateId }, { enabled: templateId > 0 }
  );
  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId }, { enabled: householdId > 0 }
  );
  const addMutation = trpc.planTemplates.addTemplateTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
      setShowAddTask(false);
      setNewTaskName(""); setNewTaskDesc(""); setNewTaskDueDays(""); setNewTaskFreq("once");
      setNewTaskDurationDays(""); setNewTaskDurationMinutes(""); setNewTaskEnableRotation(false); setNewTaskAssigned([]);
      toast.success("Aufgabe hinzugefügt");
    },
    onError: () => toast.error("Fehler beim Hinzufügen"),
  });
  const updateMutation = trpc.planTemplates.updateTemplateTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
      setEditingTaskId(null);
      toast.success("Aufgabe aktualisiert");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });
  const deleteMutation = trpc.planTemplates.deleteTemplateTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
      toast.success("Aufgabe entfernt");
    },
    onError: () => toast.error("Fehler beim Entfernen"),
  });

  const startEditTask = (item: any) => {
    setEditingTaskId(item.id);
    setEditTaskName(item.name);
    setEditTaskDesc(item.description ?? "");
    setEditTaskDueDays(item.dueDaysFromStart != null ? String(item.dueDaysFromStart) : "");
    setEditTaskFreq(item.frequency ?? "once");
    setEditTaskRepeatInterval(String(item.repeatInterval ?? 1));
    setEditTaskRepeatUnit(item.repeatUnit ?? "weeks");
    setEditTaskDurationDays(String(item.durationDays ?? ""));
    setEditTaskDurationMinutes(String(item.durationMinutes ?? ""));
    setEditTaskEnableRotation(item.enableRotation ?? false);
    setEditTaskRequiredPersons(String(item.requiredPersons ?? 1));
    setEditTaskAssigned((item.assignedToMemberIds as number[]) ?? []);
    setEditTaskPrereqs((item.prerequisiteItemIds as number[]) ?? []);
    setEditTaskFollowups((item.followupItemIds as number[]) ?? []);
  };

  // Wiederholungsparameter aus Formular-State ableiten
  // Direkte Übernahme des frequency-Werts (daily/weekly/monthly/custom/once)
  // repeatInterval und repeatUnit nur bei "custom" relevant
  const buildRepeatParams = (freq: string, interval: string, unit: string) => {
    if (freq === "once") return { frequency: "once" as const, repeatInterval: null as number|null, repeatUnit: null as string|null };
    if (freq === "daily") return { frequency: "daily" as const, repeatInterval: 1, repeatUnit: "days" as const };
    if (freq === "weekly") return { frequency: "weekly" as const, repeatInterval: 1, repeatUnit: "weeks" as const };
    if (freq === "monthly") return { frequency: "monthly" as const, repeatInterval: 1, repeatUnit: "months" as const };
    // custom
    const iv = parseInt(interval) || 1;
    return { frequency: "custom" as const, repeatInterval: iv, repeatUnit: unit as "days"|"weeks"|"months" };
  };

  const FREQ_LABELS: Record<string, string> = {
    once: "Einmalig", daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich", custom: "Benutzerdefiniert"
  };

  const renderTaskForm = (
    mode: "add"|"edit", itemId: number|undefined,
    name: string, setName: (v:string)=>void,
    desc: string, setDesc: (v:string)=>void,
    dueDays: string, setDueDays: (v:string)=>void,
    freq: string, setFreq: (v:any)=>void,
    repeatInterval: string, setRepeatInterval: (v:string)=>void,
    repeatUnit: string, setRepeatUnit: (v:any)=>void,
    durationDays: string, setDurationDays: (v:string)=>void,
    durationMinutes: string, setDurationMinutes: (v:string)=>void,
    enableRotation: boolean, setEnableRotation: (v:boolean)=>void,
    requiredPersons: string, setRequiredPersons: (v:string)=>void,
    assigned: number[], setAssigned: (v:number[])=>void,
    prereqs: number[], setPrereqs: (v:number[])=>void,
    followups: number[], setFollowups: (v:number[])=>void,
    onSave: ()=>void, onCancel: ()=>void, isPending: boolean
  ) => {
    // Andere Aufgaben für Vor-/Folgeaufgaben-Auswahl (alle außer der aktuell bearbeiteten)
    const otherTasks = (taskItems as any[]).filter((t: any) => t.id !== itemId);
    return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <Input placeholder="Aufgabenname *" value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
      <Textarea placeholder="Beschreibung (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="text-sm resize-none" rows={2} />
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">Fällig nach (Tage)</Label>
        <Input type="number" min="0" placeholder="z.B. 3" value={dueDays} onChange={e => setDueDays(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">Häufigkeit</Label>
        <Select value={freq} onValueChange={setFreq}>
          <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="once">Einmalig</SelectItem>
            <SelectItem value="daily">Täglich</SelectItem>
            <SelectItem value="weekly">Wöchentlich</SelectItem>
            <SelectItem value="monthly">Monatlich</SelectItem>
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {freq === "custom" && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">Alle</Label>
          <Input type="number" min="1" value={repeatInterval} onChange={e => setRepeatInterval(e.target.value)} className="h-7 text-sm w-16" />
          <Select value={repeatUnit} onValueChange={setRepeatUnit}>
            <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Tage</SelectItem>
              <SelectItem value="weeks">Wochen</SelectItem>
              <SelectItem value="months">Monate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">Dauer (Tage)</Label>
        <Input type="number" min="0" placeholder="0" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">Dauer (Min.)</Label>
        <Input type="number" min="0" max="1439" placeholder="0" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      {(members as any[]).length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">Zugewiesen an</Label>
          <div className="flex flex-wrap gap-1.5">
            {(members as any[]).map((m: any) => (
              <button key={m.id} type="button"
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${assigned.includes(m.id) ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-background border-border text-muted-foreground"}`}
                onClick={() => setAssigned(assigned.includes(m.id) ? assigned.filter((id: number) => id !== m.id) : [...assigned, m.id])}
              >
                {m.memberName}
              </button>
            ))}
          </div>
        </div>
      )}
      {freq !== "once" && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`rot-${mode}-${itemId ?? "new"}`} checked={enableRotation} onChange={e => setEnableRotation(e.target.checked)} className="rounded" />
          <Label htmlFor={`rot-${mode}-${itemId ?? "new"}`} className="text-xs cursor-pointer">Rotation aktivieren</Label>
          {enableRotation && (
            <>
              <Label className="text-xs text-muted-foreground ml-2">Personen:</Label>
              <Input type="number" min="1" value={requiredPersons} onChange={e => setRequiredPersons(e.target.value)} className="h-7 text-sm w-16" />
            </>
          )}
        </div>
      )}
      {/* Voraufgaben */}
      {otherTasks.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">Voraufgaben (müssen vorher erledigt sein)</Label>
          <div className="flex flex-wrap gap-1.5">
            {otherTasks.map((t: any) => (
              <button key={t.id} type="button"
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  prereqs.includes(t.id) ? "bg-orange-100 border-orange-300 text-orange-700" : "bg-background border-border text-muted-foreground"
                }`}
                onClick={() => {
                  const next = prereqs.includes(t.id) ? prereqs.filter(id => id !== t.id) : [...prereqs, t.id];
                  setPrereqs(next);
                  // Bidirektional: Folgeaufgabe beim anderen setzen
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Folgeaufgaben */}
      {otherTasks.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">Folgeaufgaben (werden danach fällig)</Label>
          <div className="flex flex-wrap gap-1.5">
            {otherTasks.map((t: any) => (
              <button key={t.id} type="button"
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  followups.includes(t.id) ? "bg-green-100 border-green-300 text-green-700" : "bg-background border-border text-muted-foreground"
                }`}
                onClick={() => {
                  const next = followups.includes(t.id) ? followups.filter(id => id !== t.id) : [...followups, t.id];
                  setFollowups(next);
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 h-7 text-xs" disabled={!name.trim() || isPending} onClick={onSave}>
          <Check className="w-3 h-3 mr-1" />Speichern
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />Abbrechen
        </Button>
      </div>
    </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {(taskItems as any[]).length === 0 ? "Noch keine Aufgaben" : `${(taskItems as any[]).length} Aufgabe${(taskItems as any[]).length !== 1 ? "n" : ""}`}
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddTask(!showAddTask)}>
          <Plus className="w-3 h-3 mr-1" />Aufgabe hinzufügen
        </Button>
      </div>
      {showAddTask && renderTaskForm(
        "add", undefined,
        newTaskName, setNewTaskName, newTaskDesc, setNewTaskDesc,
        newTaskDueDays, setNewTaskDueDays, newTaskFreq, setNewTaskFreq,
        newTaskRepeatInterval, setNewTaskRepeatInterval, newTaskRepeatUnit, setNewTaskRepeatUnit,
        newTaskDurationDays, setNewTaskDurationDays, newTaskDurationMinutes, setNewTaskDurationMinutes,
        newTaskEnableRotation, setNewTaskEnableRotation, newTaskRequiredPersons, setNewTaskRequiredPersons,
        newTaskAssigned, setNewTaskAssigned,
        newTaskPrereqs, setNewTaskPrereqs,
        newTaskFollowups, setNewTaskFollowups,
        () => {
          const { frequency, repeatInterval: ri, repeatUnit: ru } = buildRepeatParams(newTaskFreq, newTaskRepeatInterval, newTaskRepeatUnit);
          addMutation.mutate({
            templateId, name: newTaskName.trim(),
            description: newTaskDesc.trim() || null,
            assignedToMemberIds: newTaskAssigned,
            dueDaysFromStart: newTaskDueDays ? parseInt(newTaskDueDays) : null,
            frequency, repeatInterval: ri as number|null, repeatUnit: ru as "days"|"weeks"|"months"|null,
            durationDays: parseInt(newTaskDurationDays) || 0,
            durationMinutes: parseInt(newTaskDurationMinutes) || 0,
            enableRotation: newTaskEnableRotation,
            requiredPersons: newTaskEnableRotation ? parseInt(newTaskRequiredPersons) || 1 : null,
            prerequisiteItemIds: newTaskPrereqs,
            followupItemIds: newTaskFollowups,
          });
        },
        () => setShowAddTask(false),
        addMutation.isPending
      )}
      {(taskItems as any[]).map((item: any) => (
        <div key={item.id} className="rounded-lg border border-border bg-card p-2">
          {editingTaskId === item.id ? renderTaskForm(
            "edit", item.id,
            editTaskName, setEditTaskName, editTaskDesc, setEditTaskDesc,
            editTaskDueDays, setEditTaskDueDays, editTaskFreq, setEditTaskFreq,
            editTaskRepeatInterval, setEditTaskRepeatInterval, editTaskRepeatUnit, setEditTaskRepeatUnit,
            editTaskDurationDays, setEditTaskDurationDays, editTaskDurationMinutes, setEditTaskDurationMinutes,
            editTaskEnableRotation, setEditTaskEnableRotation, editTaskRequiredPersons, setEditTaskRequiredPersons,
            editTaskAssigned, setEditTaskAssigned,
            editTaskPrereqs, setEditTaskPrereqs,
            editTaskFollowups, setEditTaskFollowups,
            () => {
              const { frequency, repeatInterval: ri, repeatUnit: ru } = buildRepeatParams(editTaskFreq, editTaskRepeatInterval, editTaskRepeatUnit);
              updateMutation.mutate({
                itemId: item.id, name: editTaskName.trim(),
                description: editTaskDesc.trim() || null,
                assignedToMemberIds: editTaskAssigned,
                dueDaysFromStart: editTaskDueDays ? parseInt(editTaskDueDays) : null,
                frequency, repeatInterval: ri as number|null, repeatUnit: ru as "days"|"weeks"|"months"|null,
                durationDays: parseInt(editTaskDurationDays) || 0,
                durationMinutes: parseInt(editTaskDurationMinutes) || 0,
                enableRotation: editTaskEnableRotation,
                requiredPersons: editTaskEnableRotation ? parseInt(editTaskRequiredPersons) || 1 : null,
                prerequisiteItemIds: editTaskPrereqs,
                followupItemIds: editTaskFollowups,
              });
            },
            () => setEditingTaskId(null),
            updateMutation.isPending
          ) : (
            <div className="flex items-start gap-2">
              <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.frequency && item.frequency !== "once" && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {FREQ_LABELS[item.frequency] ?? item.frequency}
                      {item.repeatInterval > 1 && ` (alle ${item.repeatInterval} ${item.repeatUnit === "days" ? "Tage" : item.repeatUnit === "weeks" ? "Wochen" : "Monate"})`}
                    </span>
                  )}
                  {item.dueDaysFromStart != null && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Fällig nach {item.dueDaysFromStart} Tag{item.dueDaysFromStart !== 1 ? "en" : ""}
                    </span>
                  )}
                  {(item.durationDays > 0 || item.durationMinutes > 0) && (
                    <span className="text-xs text-muted-foreground">
                      {item.durationDays > 0 && `${item.durationDays}T `}{item.durationMinutes > 0 && `${item.durationMinutes}min`}
                    </span>
                  )}
                  {item.enableRotation && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Rotation</span>}
                  {(item.assignedToMemberIds as number[]|null)?.length ? (
                    <span className="text-xs text-muted-foreground">
                      → {(item.assignedToMemberIds as number[]).map((id: number) => {
                        const m = (members as any[]).find((x: any) => x.id === id);
                        return m?.memberName ?? `#${id}`;
                      }).join(", ")}
                    </span>
                  ) : null}
                  {/* Voraufgaben anzeigen */}
                  {(item.prerequisiteItemIds as number[]|null)?.length ? (
                    <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      ⏮ {(item.prerequisiteItemIds as number[]).map((id: number) => {
                        const t = (taskItems as any[]).find((x: any) => x.id === id);
                        return t?.name ?? `#${id}`;
                      }).join(", ")}
                    </span>
                  ) : null}
                  {/* Folgeaufgaben anzeigen */}
                  {(item.followupItemIds as number[]|null)?.length ? (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      ⏭ {(item.followupItemIds as number[]).map((id: number) => {
                        const t = (taskItems as any[]).find((x: any) => x.id === id);
                        return t?.name ?? `#${id}`;
                      }).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEditTask(item)}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate({ itemId: item.id })}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// ─── Vorlage erstellen/bearbeiten Dialog ─────────────────────────────────────
function TemplateFormDialog({
  open, onClose, householdId, memberId, template
}: {
  open: boolean;
  onClose: () => void;
  householdId: number;
  memberId: number;
  template?: any;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [type, setType] = useState<TemplateType>(template?.type ?? "shopping");

  // State zurücksetzen wenn Dialog öffnet
  const handleOpen = () => {
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setType(template?.type ?? "shopping");
  };

  const createMutation = trpc.planTemplates.createTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success("Vorlage erstellt");
      onClose();
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success("Vorlage gespeichert");
      onClose();
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (template) {
      updateMutation.mutate({
        templateId: template.id,
        householdId,
        memberId,
        name: name.trim(),
        description: description.trim() || null,
        type,
      });
    } else {
      createMutation.mutate({
        householdId,
        memberId,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              placeholder="z.B. Wocheneinkauf, Grillabend..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Textarea
              placeholder="Optionale Beschreibung..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={v => setType(v as TemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopping">🛒 Einkaufsliste</SelectItem>
                <SelectItem value="tasks">✅ Aufgaben</SelectItem>
                <SelectItem value="project">📁 Projekt</SelectItem>
                <SelectItem value="mixed">🔀 Gemischt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {template ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aktive Pläne Tab ─────────────────────────────────────────────────────────
function InstancesTab({ householdId, memberId }: { householdId: number; memberId: number }) {
  const utils = trpc.useUtils();
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);

  const { data: instances = [], isLoading } = trpc.planTemplates.listInstances.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const completeMutation = trpc.planTemplates.completeInstance.useMutation({
    onSuccess: () => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success("Plan abgeschlossen");
    },
  });

  const cancelMutation = trpc.planTemplates.cancelInstance.useMutation({
    onSuccess: () => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success("Plan storniert");
    },
  });

  const activeInstances = instances.filter((i: any) => i.status === "active");
  const doneInstances = instances.filter((i: any) => i.status !== "active");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Keine aktiven Pläne</p>
        <p className="text-sm mt-1">Starte eine Vorlage aus dem Vorlagen-Tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeInstances.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Aktiv</h3>
          {activeInstances.map((instance: any) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              householdId={householdId}
              memberId={memberId}
              isExpanded={selectedInstanceId === instance.id}
              onToggle={() => setSelectedInstanceId(
                selectedInstanceId === instance.id ? null : instance.id
              )}
              onComplete={() => completeMutation.mutate({ instanceId: instance.id, householdId, memberId })}
              onCancel={() => cancelMutation.mutate({ instanceId: instance.id, householdId, memberId })}
            />
          ))}
        </div>
      )}

      {doneInstances.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Abgeschlossen / Storniert</h3>
          {doneInstances.slice(0, 5).map((instance: any) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              householdId={householdId}
              memberId={memberId}
              isExpanded={selectedInstanceId === instance.id}
              onToggle={() => setSelectedInstanceId(
                selectedInstanceId === instance.id ? null : instance.id
              )}
              onComplete={() => {}}
              onCancel={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Instanz-Karte ────────────────────────────────────────────────────────────
function InstanceCard({
  instance, householdId, memberId, isExpanded, onToggle, onComplete, onCancel
}: {
  instance: any;
  householdId: number;
  memberId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const utils = trpc.useUtils();
  const isActive = instance.status === "active";
  const progress = instance.totalItems > 0
    ? Math.round((instance.transferredItems / instance.totalItems) * 100)
    : 0;
  // Tab-State für gemischte Pläne
  const [activeTab, setActiveTab] = useState<"shopping"|"tasks">("shopping");
  const hasShoppingItems = (instance.totalShoppingItems ?? 0) > 0;
  const hasTaskItems = (instance.totalTaskItems ?? 0) > 0;
  const isMixed = hasShoppingItems && hasTaskItems;

  const transferAllMutation = trpc.planTemplates.transferAllItems.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.planTemplates.getInstance.invalidate({ instanceId: instance.id });
      utils.shopping.list.invalidate({ householdId });
      toast.success(`${data.count} Artikel zur Einkaufsliste hinzugefügt`);
    },
    onError: () => toast.error("Fehler beim Übertragen"),
  });

  const transferAllTasksMutation = trpc.planTemplates.transferAllTaskItems.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.planTemplates.getInstance.invalidate({ instanceId: instance.id });
      utils.tasks.list.invalidate({ householdId });
      toast.success(`${data.count} Aufgabe${data.count !== 1 ? "n" : ""} übertragen`);
    },
    onError: () => toast.error("Fehler beim Übertragen"),
  });

  // Icon je nach Typ
  const TypeIcon = hasTaskItems && !hasShoppingItems ? CheckSquare
    : hasShoppingItems && !hasTaskItems ? ShoppingCart
    : Layers;
  const iconColor = hasTaskItems && !hasShoppingItems ? "text-blue-600"
    : hasShoppingItems && !hasTaskItems ? "text-amber-600"
    : "text-orange-600";
  const iconBg = hasTaskItems && !hasShoppingItems ? "bg-blue-50"
    : hasShoppingItems && !hasTaskItems ? "bg-amber-50"
    : "bg-orange-50";

  return (
    <Card className={`transition-shadow ${isActive ? "hover:shadow-md" : "opacity-70"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 cursor-pointer" onClick={onToggle}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isActive ? iconBg : "bg-muted"
          }`}>
            <TypeIcon className={`w-5 h-5 ${isActive ? iconColor : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{instance.label ?? instance.templateName}</h3>
              {instance.status === "completed" && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Abgeschlossen</Badge>
              )}
              {instance.status === "cancelled" && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">Storniert</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {hasShoppingItems && (
                <span><ShoppingCart className="w-3 h-3 inline mr-0.5" />{instance.transferredShoppingItems ?? 0}/{instance.totalShoppingItems ?? 0}</span>
              )}
              {hasTaskItems && (
                <span><CheckSquare className="w-3 h-3 inline mr-0.5" />{instance.transferredTaskItems ?? 0}/{instance.totalTaskItems ?? 0}</span>
              )}
              <span>{new Date(instance.startedAt).toLocaleDateString("de-DE")}</span>
            </div>
            {instance.totalItems > 0 && (
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>

        {/* Aufgeklappter Bereich */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border" onClick={e => e.stopPropagation()}>
            {/* Tab-Switch für gemischte Pläne */}
            {isMixed && (
              <div className="flex gap-1 mb-3 bg-muted rounded-lg p-1">
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "shopping" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("shopping")}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Einkauf ({instance.totalShoppingItems})
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "tasks" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("tasks")}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Aufgaben ({instance.totalTaskItems})
                </button>
              </div>
            )}

            {/* Shopping-Items */}
            {(!isMixed || activeTab === "shopping") && hasShoppingItems && (
              <InstanceItemsList
                instanceId={instance.id}
                householdId={householdId}
                memberId={memberId}
                isActive={isActive}
                onTransferAll={() => transferAllMutation.mutate({ instanceId: instance.id, householdId, memberId })}
                transferAllPending={transferAllMutation.isPending}
                onComplete={isMixed ? () => {} : onComplete}
                onCancel={isMixed ? () => {} : onCancel}
                hidePlanButtons={isMixed}
              />
            )}

            {/* Aufgaben-Items */}
            {(!isMixed || activeTab === "tasks") && hasTaskItems && (
              <InstanceTaskItemsList
                instanceId={instance.id}
                householdId={householdId}
                memberId={memberId}
                isActive={isActive}
                onTransferAll={() => transferAllTasksMutation.mutate({ instanceId: instance.id, householdId, memberId })}
                transferAllPending={transferAllTasksMutation.isPending}
                onComplete={isMixed ? () => {} : onComplete}
                onCancel={isMixed ? () => {} : onCancel}
                hidePlanButtons={isMixed}
              />
            )}

            {/* Plan abschließen / stornieren (nur bei gemischten Plänen hier anzeigen) */}
            {isMixed && isActive && (
              <div className="flex gap-2 pt-2 border-t border-border mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                  onClick={onComplete}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Plan abschließen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={onCancel}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Stornieren
                </Button>
              </div>
            )}

            {/* Nur Aufgaben (kein Shopping) */}
            {!isMixed && !hasShoppingItems && hasTaskItems && (
              <InstanceTaskItemsList
                instanceId={instance.id}
                householdId={householdId}
                memberId={memberId}
                isActive={isActive}
                onTransferAll={() => transferAllTasksMutation.mutate({ instanceId: instance.id, householdId, memberId })}
                transferAllPending={transferAllTasksMutation.isPending}
                onComplete={onComplete}
                onCancel={onCancel}
                hidePlanButtons={false}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Instanz-Artikelliste ─────────────────────────────────────────────────────
function InstanceItemsList({
  instanceId, householdId, memberId, isActive,
  onTransferAll, transferAllPending, onComplete, onCancel, hidePlanButtons
}: {
  instanceId: number;
  householdId: number;
  memberId: number;
  isActive: boolean;
  onTransferAll: () => void;
  transferAllPending: boolean;
  onComplete: () => void;
  onCancel: () => void;
  hidePlanButtons?: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: instance } = trpc.planTemplates.getInstance.useQuery(
    { instanceId },
    { enabled: instanceId > 0 }
  );

  const transferItemMutation = trpc.planTemplates.transferItems.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.shopping.list.invalidate({ householdId });
      toast.success("Artikel zur Einkaufsliste hinzugefügt");
    },
    onError: () => toast.error("Fehler beim Übertragen"),
  });

  const untransferMutation = trpc.planTemplates.untransferItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.shopping.list.invalidate({ householdId });
      toast.success("Übertragung rückgängig gemacht");
    },
    onError: () => toast.error("Fehler"),
  });

  const items = instance?.items ?? [];
  const pendingItems = items.filter((i: any) => !i.isTransferred);
  const transferredItems = items.filter((i: any) => i.isTransferred);

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
      {/* Aktions-Buttons */}
      {isActive && pendingItems.length > 0 && (
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={onTransferAll}
          disabled={transferAllPending}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Alle {pendingItems.length} Artikel zur Einkaufsliste hinzufügen
        </Button>
      )}

      {/* Ausstehende Artikel */}
      {pendingItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Noch nicht übertragen</p>
          {pendingItems.map((item: any) => {
            const unit = item.unitId ? { id: item.unitId, name: item.unitName, symbol: item.unitSymbol } : null;
            return (
              <div key={item.id} className="flex items-center gap-2 py-1">
                {item.categoryColor && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />
                )}
                <span className="flex-1 text-sm">{item.name}</span>
                {item.quantity && (
                  <span className="text-xs text-muted-foreground">{formatQuantityWithUnit(item.quantity, unit)}</span>
                )}
                {isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => transferItemMutation.mutate({
                      instanceId,
                      householdId,
                      memberId,
                      items: [{
                        instanceItemId: item.id,
                        name: item.name,
                        categoryId: item.categoryId,
                        quantity: item.quantity ? parseFloat(item.quantity) : null,
                        unitId: item.unitId,
                        notes: item.notes ?? null,
                      }],
                    })}
                    disabled={transferItemMutation.isPending}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Übertragen
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Übertragene Artikel */}
      {transferredItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Bereits in Einkaufsliste</p>
          {transferredItems.map((item: any) => {
            const unit = item.unitId ? { id: item.unitId, name: item.unitName, symbol: item.unitSymbol } : null;
            return (
              <div key={item.id} className="flex items-center gap-2 py-1 opacity-60">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="flex-1 text-sm line-through">{item.name}</span>
                {item.quantity && (
                  <span className="text-xs text-muted-foreground">{formatQuantityWithUnit(item.quantity, unit)}</span>
                )}
                {isActive && item.shoppingItemId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => untransferMutation.mutate({
                      instanceItemId: item.id,
                      shoppingItemId: item.shoppingItemId,
                    })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Plan abschließen / stornieren */}
      {isActive && !hidePlanButtons && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
            onClick={onComplete}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Plan abschließen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Stornieren
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Instanz-Aufgabenliste ────────────────────────────────────────────────────
function InstanceTaskItemsList({
  instanceId, householdId, memberId, isActive,
  onTransferAll, transferAllPending, onComplete, onCancel, hidePlanButtons
}: {
  instanceId: number;
  householdId: number;
  memberId: number;
  isActive: boolean;
  onTransferAll: () => void;
  transferAllPending: boolean;
  onComplete: () => void;
  onCancel: () => void;
  hidePlanButtons?: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: instance } = trpc.planTemplates.getInstance.useQuery(
    { instanceId },
    { enabled: instanceId > 0 }
  );

  const transferTaskMutation = trpc.planTemplates.transferTaskItems.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.tasks.list.invalidate({ householdId });
      toast.success("Aufgabe übertragen");
    },
    onError: () => toast.error("Fehler beim Übertragen"),
  });

  const untransferTaskMutation = trpc.planTemplates.untransferTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.tasks.list.invalidate({ householdId });
      toast.success("Übertragung rückgängig gemacht");
    },
    onError: () => toast.error("Fehler"),
  });

  const taskItems = instance?.taskItems ?? [];
  const pendingTasks = taskItems.filter((t: any) => !t.isTransferred);
  const transferredTasks = taskItems.filter((t: any) => t.isTransferred);

  const FREQ_LABELS: Record<string, string> = {
    once: "Einmalig", daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich", custom: "Benutzerdefiniert"
  };

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Alle übertragen Button */}
      {isActive && pendingTasks.length > 0 && (
        <Button
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onTransferAll}
          disabled={transferAllPending}
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Alle {pendingTasks.length} Aufgabe{pendingTasks.length !== 1 ? "n" : ""} übertragen
        </Button>
      )}

      {/* Ausstehende Aufgaben */}
      {pendingTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Noch nicht übertragen</p>
          {pendingTasks.map((task: any) => (
            <div key={task.id} className="flex items-start gap-2 py-1">
              <CheckSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm">{task.name}</span>
                {task.frequency && task.frequency !== "once" && (
                  <span className="ml-1.5 text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                    {FREQ_LABELS[task.frequency] ?? task.frequency}
                  </span>
                )}
                {task.dueDaysFromStart != null && (
                  <span className="ml-1.5 text-xs text-amber-600">
                    (fällig nach {task.dueDaysFromStart}T)
                  </span>
                )}
              </div>
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs flex-shrink-0"
                  onClick={() => transferTaskMutation.mutate({
                    instanceId,
                    householdId,
                    memberId,
                    itemIds: [task.id],
                  })}
                  disabled={transferTaskMutation.isPending}
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Übertragen
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Übertragene Aufgaben */}
      {transferredTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Bereits übertragen</p>
          {transferredTasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-2 py-1 opacity-60">
              <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="flex-1 text-sm line-through">{task.name}</span>
              {isActive && task.taskId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground flex-shrink-0"
                  onClick={() => untransferTaskMutation.mutate({
                    instanceItemId: task.id,
                    taskId: task.taskId,
                  })}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plan abschließen / stornieren */}
      {isActive && !hidePlanButtons && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
            onClick={onComplete}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Plan abschließen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Stornieren
          </Button>
        </div>
      )}
    </div>
  );
}

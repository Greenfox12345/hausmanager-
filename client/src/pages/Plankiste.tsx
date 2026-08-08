/**
 * Plankiste – Vorlagen für wiederkehrende Einkäufe, Aufgaben und Projekte
 *
 * Struktur:
 * - Tab "Vorlagen": Alle Vorlagen anzeigen, neue erstellen, bearbeiten, starten
 * - Tab "Aktive Pläne": Gestartete Instanzen mit Übertragungsfunktion
 */
import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowRight, Check, X, ListChecks, Layers, GitBranch
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { QuantityInput, formatQuantityWithUnit, type UnitOption } from "@/components/QuantityInput";
import PageHeader from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { PlanVariablesPanel } from "@/components/PlanVariablesPanel";
import { VarText } from "@/components/VarToken";
import { tokenizeWithVars, buildVarColorMap, mergeVarsFromText } from "@/lib/varParser";
import { evaluateFormula, buildVarValueMap, type PlanVariable } from "@/lib/varParser";
import { parseVarAssignment } from "@/lib/varParser";
import { topoSortTasks } from "@/lib/varParser";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

// ─── Typen ────────────────────────────────────────────────────────────────────
type TemplateType = "shopping" | "tasks" | "project" | "mixed";

// TYPE_LABELS wird jetzt dynamisch via useTranslation erzeugt – siehe getTypeLabels() in der Hauptkomponente

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
  const { t } = useTranslation(["plankiste", "common"]);
  const TYPE_LABELS: Record<TemplateType, string> = {
    shopping: t("common:plankiste.typeLabels.shopping"),
    tasks: t("common:plankiste.typeLabels.tasks"),
    project: t("common:plankiste.typeLabels.tasks"), // Projekt fällt weg, Fallback auf Tasks
    mixed: t("common:plankiste.typeLabels.mixed"),
  };
  const [, setLocation] = useLocation();
  const { household, member } = useCompatAuth();
  const householdId = household?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;

  const [activeTab, setActiveTab] = useState<"templates" | "instances">("templates");

  if (!householdId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t("plankiste:noHousehold")}
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
          title={t("plankiste:title")}
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
            {t("plankiste:tabs.templates")}
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "instances"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("instances")}
          >
            {t("plankiste:tabs.instances")}
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
type SortOption = "name_asc" | "name_desc" | "date_asc" | "date_desc";

function SortBar({ sort, onChange }: { sort: SortOption; onChange: (s: SortOption) => void }) {
  const { t } = useTranslation("plankiste");
  const options: { value: SortOption; label: string }[] = [
    { value: "date_desc", label: t("sort.dateDesc") },
    { value: "date_asc",  label: t("sort.dateAsc") },
    { value: "name_asc",  label: t("sort.nameAsc") },
    { value: "name_desc", label: t("sort.nameDesc") },
  ];
  return (
    <div className="flex items-center gap-2">
      <Select value={sort} onValueChange={v => onChange(v as SortOption)}>
        <SelectTrigger className="h-8 text-xs w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function sortItems<T extends { name: string; createdAt?: string | number | null }>(items: T[], sort: SortOption): T[] {
  return [...items].sort((a, b) => {
    if (sort === "name_asc") return a.name.localeCompare(b.name, "de");
    if (sort === "name_desc") return b.name.localeCompare(a.name, "de");
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sort === "date_asc" ? da - db : db - da;
  });
}

function TemplatesTab({ householdId, memberId }: { householdId: number; memberId: number }) {
  const { t } = useTranslation(["plankiste", "common"]);
  const TYPE_LABELS: Record<TemplateType, string> = {
    shopping: t("common:plankiste.typeLabels.shopping"),
    tasks: t("common:plankiste.typeLabels.tasks"),
    project: t("common:plankiste.typeLabels.tasks"),
    mixed: t("common:plankiste.typeLabels.mixed"),
  };
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("date_desc");

  const { data: templates = [], isLoading } = trpc.planTemplates.listTemplates.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const archiveMutation = trpc.planTemplates.archiveTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success(t("plankiste:templates.deleted"));
    },
    onError: () => toast.error(t("plankiste:templates.deleteError")),
  });

  const startMutation = trpc.planTemplates.startTemplate.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
            toast.success(t("plankiste:startDialog.started"));
    },
    onError: () => toast.error(t("plankiste:startDialog.startError")),
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

  const sortedTemplates = sortItems(templates as any[], sort);

  return (
    <div className="space-y-4">
      {/* Neue Vorlage erstellen + Sortierung */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("plankiste:templates.newTemplate")}
        </Button>
        {templates.length > 1 && <SortBar sort={sort} onChange={setSort} />}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t("plankiste:templates.empty")}</p>
          <p className="text-sm mt-1">{t("plankiste:templates.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTemplates.map((template) => {
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
                        <span>{t("plankiste:templates.items", { count: template.itemCount })}</span>
                        {template.usageCount > 0 && (
                          <span>{t("plankiste:templates.usageCount", { count: template.usageCount })}</span>
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
                        {t("plankiste:templates.startPlan")}
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
                            {t("plankiste:templates.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => archiveMutation.mutate({ templateId: template.id, householdId, memberId })}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            {t("plankiste:templates.delete")}
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
  const { t } = useTranslation(["plankiste", "common"]);
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

  // Variablen-System: enableVariables und Variablen-Liste aus der Vorlage
  const enableVariables = (template as any)?.enableVariables ?? false;
  const templateVariables: PlanVariable[] = (template as any)?.variables ?? [];
  const varValueMap = buildVarValueMap(templateVariables);

  // Hilfsfunktion: Menge auflösen (VAR-Name → berechneter Wert oder direkte Zahl)
  const resolveQuantity = (qty: string | null | undefined): string | null => {
    if (!qty) return null;
    if (!enableVariables) return qty;
    const varMatch = qty.match(/^VAR([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9]*)$/);
    if (!varMatch) return qty;
    const varName = varMatch[1];
    const rawValue = varValueMap[varName];
    if (!rawValue) return qty;
    const result = evaluateFormula(rawValue, varValueMap, varName);
    return result.ok ? result.display : qty;
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
          {items.length === 0
            ? t("plankiste:templates.noItems")
            : t("plankiste:templates.itemsCount", { count: items.length })}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setShowAddItem(!showAddItem)}
        >
          <Plus className="w-3 h-3 mr-1" />
          {t("plankiste:templates.addItem")}
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
                      {(() => {
                        const resolved = resolveQuantity(item.quantity);
                        const isVar = enableVariables && item.quantity?.startsWith("VAR");
                        if (isVar && resolved !== item.quantity) {
                          return (
                            <span>
                              <span className="font-mono text-violet-600">{item.quantity}</span>
                              <span className="text-muted-foreground"> → {resolved}{unit ? ` ${unit.symbol ?? unit.name}` : ""}</span>
                            </span>
                          );
                        }
                        return <span>{formatQuantityWithUnit(resolved, unit)}</span>;
                      })()}
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
  const { t } = useTranslation("plankiste");
  const utils = trpc.useUtils();
  // Vorlage laden um enableVariables und variables zu kennen (für farbige Anzeige)
  const { data: template } = trpc.planTemplates.getTemplate.useQuery(
    { templateId }, { enabled: templateId > 0 }
  );
  const enableVariables = (template as any)?.enableVariables ?? false;
  const savedVariables = (template as any)?.variables ?? [];
  const varColorMap = buildVarColorMap(savedVariables);
  const savedPhases: {id:string;name:string;color:string;order:number}[] = (template as any)?.phases ?? [];
  const [phaseOrganizeMode, setPhaseOrganizeMode] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseColor, setNewPhaseColor] = useState("#3b82f6");
  const [showPhasePanel, setShowPhasePanel] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<number | null>(null);
  const PHASE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1","#14b8a6","#e11d48"];
  const [taskSortOrder, setTaskSortOrder] = useState<"original" | "topo">("topo");
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
  const [newTaskPrereqs, setNewTaskPrereqs] = useState<{id:number;gapDays?:number}[]>([]);
  const [newTaskFollowups, setNewTaskFollowups] = useState<{id:number;gapDays?:number}[]>([]);
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
  const [editTaskPrereqs, setEditTaskPrereqs] = useState<{id:number;gapDays?:number}[]>([]);
  const [editTaskFollowups, setEditTaskFollowups] = useState<{id:number;gapDays?:number}[]>([]);

  // Blink-State für transitive Abhängigkeits-Visualisierung (muss auf Komponenten-Ebene stehen)
  const [blinkIds, setBlinkIds] = useState<Set<number>>(new Set());
  const blinkTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const { data: taskItems = [] } = trpc.planTemplates.listTemplateTaskItems.useQuery(
    { templateId }, { enabled: templateId > 0 }
  );
  // Topologisch sortierte Aufgaben-Liste (nur wenn Abhängigkeiten vorhanden)
  const displayedTaskItems = taskSortOrder === "topo"
    ? topoSortTasks(taskItems as any[])
    : (taskItems as any[]);
  // Phasen-sortierte Aufgaben
  const phaseDisplayedTaskItems = savedPhases.length > 0 ? sortByPhase(displayedTaskItems) : displayedTaskItems;
  // Phasen-Verletzungen
  const phaseViolations = getPhaseViolations(taskItems as any[]);
  const hasAnyDeps = (taskItems as any[]).some((t: any) =>
    (Array.isArray(t.prerequisiteItemIds) && t.prerequisiteItemIds.length > 0) ||
    (Array.isArray(t.followupItemIds) && t.followupItemIds.length > 0)
  );
  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId }, { enabled: householdId > 0 }
  );
  // Mutation um Variablen nach Aufgaben-Speicherung zu aktualisieren
  const updateVarsMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.getTemplate.invalidate({ templateId });
    },
  });

  const updatePhasesMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => { utils.planTemplates.getTemplate.invalidate({ templateId }); },
  });

  function getPhaseViolations(tasks: any[]): Array<{taskId: number; taskName: string; depName: string; reason: string}> {
    const violations: Array<{taskId: number; taskName: string; depName: string; reason: string}> = [];
    const sp = [...savedPhases].sort((a, b) => a.order - b.order);
    const pi = (phaseId: string | null) => { if (!phaseId) return 999; const i = sp.findIndex(p => p.id === phaseId); return i === -1 ? 999 : i; };
    for (const task of tasks) {
      const tp = pi(task.phaseId);
      for (const entry of (task.prerequisiteItemIds ?? []) as (number|{id:number})[]) {
        const depId = typeof entry === "number" ? entry : entry.id;
        const dep = tasks.find((t: any) => t.id === depId);
        if (!dep) continue;
        if (pi(dep.phaseId) > tp) violations.push({ taskId: task.id, taskName: task.name, depName: dep.name, reason: `Voraussetzung „${dep.name}" liegt in einer späteren Phase` });
      }
    }
    return violations;
  }

  function sortByPhase(tasks: any[]): any[] {
    if (savedPhases.length === 0) return tasks;
    const sp = [...savedPhases].sort((a, b) => a.order - b.order);
    const pi = (phaseId: string | null) => { if (!phaseId) return sp.length; const i = sp.findIndex(p => p.id === phaseId); return i === -1 ? sp.length : i; };
    return [...tasks].sort((a, b) => pi(a.phaseId) - pi(b.phaseId));
  }

  const addPhase = () => {
    if (!newPhaseName.trim() || savedPhases.length >= 12) return;
    const autoColor = PHASE_COLORS[savedPhases.length % PHASE_COLORS.length];
    const newPhase = { id: `ph_${Date.now()}`, name: newPhaseName.trim(), color: newPhaseColor || autoColor, order: savedPhases.length };
    updatePhasesMutation.mutate({ templateId, householdId, memberId, phases: [...savedPhases, newPhase] });
    setNewPhaseName("");
    setNewPhaseColor(PHASE_COLORS[(savedPhases.length + 1) % PHASE_COLORS.length]);
  };
  const deletePhase = (phaseId: string) => {
    updatePhasesMutation.mutate({ templateId, householdId, memberId, phases: savedPhases.filter(p => p.id !== phaseId).map((p, i) => ({ ...p, order: i })) });
    (taskItems as any[]).filter((t: any) => t.phaseId === phaseId).forEach((t: any) => updateMutation.mutate({ itemId: t.id, phaseId: null }));
  };
  const updatePhaseColor = (phaseId: string, color: string) => {
    updatePhasesMutation.mutate({ templateId, householdId, memberId, phases: savedPhases.map(p => p.id === phaseId ? { ...p, color } : p) });
  };
  const updatePhaseName = (phaseId: string, name: string) => {
    updatePhasesMutation.mutate({ templateId, householdId, memberId, phases: savedPhases.map(p => p.id === phaseId ? { ...p, name } : p) });
  };
  const assignTaskPhase = (taskId: number, phaseId: string | null) => {
    updateMutation.mutate({ itemId: taskId, phaseId });
  };

  // Drag-and-Drop State für Phasen-Reihenfolge
  const [dragPhaseId, setDragPhaseId] = useState<string | null>(null);
  const [dragOverPhaseId, setDragOverPhaseId] = useState<string | null>(null);

  const reorderPhase = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const sorted = [...savedPhases].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(p => p.id === fromId);
    const toIdx = sorted.findIndex(p => p.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((p, i) => ({ ...p, order: i }));
    updatePhasesMutation.mutate({ templateId, householdId, memberId, phases: updated });
  };

  // State für Übernahme-Dialog: erkannte Variablen-Definitionen aus Beschreibungen
  const [pendingDefinitions, setPendingDefinitions] = useState<{varName: string; formula: string}[]>([]);
  const [showAdoptDialog, setShowAdoptDialog] = useState(false);

  // Hilfsfunktion: Neue Variablen aus Text extrahieren und zur Vorlage hinzufügen
  // Außerdem: Variablen-Definitionen (VARName = Formel) erkennen und Übernahme anbieten
  const syncVarsFromText = (name: string, desc: string) => {
    if (!enableVariables) return;
    const combined = `${name} ${desc}`;
    // 1. Neue VAR-Namen in die Variablen-Liste aufnehmen
    const newVars = mergeVarsFromText(combined, savedVariables);
    if (newVars.length > savedVariables.length) {
      updateVarsMutation.mutate({ templateId, householdId, memberId, variables: newVars });
    }
    // 2. Variablen-Definitionen (VARName = Formel) in Beschreibung suchen
    const lines = desc.split(/[;\n]/);
    const found: {varName: string; formula: string}[] = [];
    for (const line of lines) {
      const assignment = parseVarAssignment(line.trim());
      if (!assignment) continue;
      // Nur vorschlagen wenn die Variable noch keinen Wert hat
      const existing = savedVariables.find((v: PlanVariable) => v.name === assignment.varName);
      if (!existing?.value) {
        // Duplikate vermeiden
        if (!found.some(f => f.varName === assignment.varName)) {
          found.push(assignment);
        }
      }
    }
    if (found.length > 0) {
      setPendingDefinitions(found);
      setShowAdoptDialog(true);
    }
  };

  // Definitionen aus Beschreibung übernehmen
  const adoptDefinitions = () => {
    const updated = savedVariables.map((v: PlanVariable) => {
      const def = pendingDefinitions.find(d => d.varName === v.name);
      if (def && !v.value) return { ...v, value: def.formula };
      return v;
    });
    updateVarsMutation.mutate({ templateId, householdId, memberId, variables: updated });
    setShowAdoptDialog(false);
    setPendingDefinitions([]);
  };

  const addMutation = trpc.planTemplates.addTemplateTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
      setShowAddTask(false);
      setNewTaskName(""); setNewTaskDesc(""); setNewTaskDueDays(""); setNewTaskFreq("once");
      setNewTaskDurationDays(""); setNewTaskDurationMinutes(""); setNewTaskEnableRotation(false); setNewTaskAssigned([]);
      toast.success("Aufgabe hinzugefügt");
      syncVarsFromText(newTaskName, newTaskDesc);
    },
    onError: () => toast.error("Fehler beim Hinzufügen"),
  });
  const updateMutation = trpc.planTemplates.updateTemplateTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplateTaskItems.invalidate({ templateId });
      setEditingTaskId(null);
      toast.success("Aufgabe aktualisiert");
      syncVarsFromText(editTaskName, editTaskDesc);
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
    // Abwärtskompatibilität: altes Format war number[], neues Format ist {id, gapDays}[]
    const normalizeDeps = (raw: unknown): {id:number;gapDays?:number}[] => {
      if (!Array.isArray(raw)) return [];
      return raw.map((entry: unknown) =>
        typeof entry === "number" ? { id: entry } : (entry as {id:number;gapDays?:number})
      );
    };
    setEditTaskPrereqs(normalizeDeps(item.prerequisiteItemIds));
    setEditTaskFollowups(normalizeDeps(item.followupItemIds));
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
    once: t("taskItems.frequency.once"),
    daily: t("taskItems.frequency.daily"),
    weekly: t("taskItems.frequency.weekly"),
    monthly: t("taskItems.frequency.monthly"),
    custom: t("taskItems.frequency.custom"),
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
    prereqs: {id:number;gapDays?:number}[], setPrereqs: (v:{id:number;gapDays?:number}[])=>void,
    followups: {id:number;gapDays?:number}[], setFollowups: (v:{id:number;gapDays?:number}[])=>void,
    onSave: ()=>void, onCancel: ()=>void, isPending: boolean
  ) => {
    // Andere Aufgaben für Vor-/Folgeaufgaben-Auswahl (alle außer der aktuell bearbeiteten)
    const otherTasks = (taskItems as any[]).filter((task: any) => task.id !== itemId);

    // Hilfsfunktionen für das neue {id, gapDays} Format
    const isPrereq = (tid: number) => prereqs.some(p => p.id === tid);
    const isFollowup = (tid: number) => followups.some(f => f.id === tid);
    const getPrereqGap = (tid: number) => prereqs.find(p => p.id === tid)?.gapDays ?? "";
    const getFollowupGap = (tid: number) => followups.find(f => f.id === tid)?.gapDays ?? "";

    const triggerBlink = (ids: number[]) => {
      const newBlinks = new Set(Array.from(blinkIds));
      ids.forEach(id => {
        newBlinks.add(id);
        const existing = blinkTimeouts.current.get(id);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => {
          setBlinkIds(prev => { const n = new Set(Array.from(prev)); n.delete(id); return n; });
          blinkTimeouts.current.delete(id);
        }, 1200);
        blinkTimeouts.current.set(id, t);
      });
      setBlinkIds(newBlinks);
    };

    // Berechnet alle transitiven Voraussetzungen einer Aufgabe (rekursiv)
    const getTransitivePrereqs = (tid: number, visited = new Set<number>()): number[] => {
      if (visited.has(tid)) return []; // Zyklus-Schutz
      visited.add(tid);
      const task = (taskItems as any[]).find((t: any) => t.id === tid);
      if (!task) return [];
      const directPrereqs: number[] = (task.prerequisiteItemIds ?? []).map((p: any) =>
        typeof p === "number" ? p : p.id
      );
      const result: number[] = [...directPrereqs];
      for (const pid of directPrereqs) {
        result.push(...getTransitivePrereqs(pid, visited));
      }
      return Array.from(new Set(result));
    };

    // Berechnet welche direkt gewählten Voraussetzungen eine bestimmte Aufgabe "erzwingen"
    // (d.h. tid ist transitiv in deren Voraussetzungen enthalten)
    const getBlockingPrereqs = (tid: number): number[] => {
      return prereqs
        .map(p => p.id)
        .filter(pid => getTransitivePrereqs(pid).includes(tid));
    };

    // Gibt true zurück wenn tid nur transitiv (nicht direkt) als Voraussetzung gesetzt ist
    const isTransitivePrereq = (tid: number): boolean => {
      if (!isPrereq(tid)) return false;
      return getBlockingPrereqs(tid).length > 0;
    };

    const togglePrereq = (tid: number) => {
      if (tid === itemId) return; // Selbst-Referenz verhindern
      if (isPrereq(tid)) {
        // Prüfen ob diese Aufgabe transitiv gesperrt ist
        const blockers = getBlockingPrereqs(tid);
        if (blockers.length > 0) {
          // Blinken lassen statt abwählen
          triggerBlink(blockers);
          return;
        }
        setPrereqs(prereqs.filter(p => p.id !== tid));
        setFollowups(followups.filter(f => f.id !== tid));
      } else {
        // Transitiv: alle Voraussetzungen von tid ebenfalls hinzufügen
        const transPrereqs = getTransitivePrereqs(tid);
        const newPrereqs = [...prereqs];
        const toAdd = [tid, ...transPrereqs].filter(id => !newPrereqs.some(p => p.id === id));
        setPrereqs([...newPrereqs, ...toAdd.map(id => ({ id }))]);
        // Bidirektional: aus Folgeaufgaben entfernen
        setFollowups(followups.filter(f => f.id !== tid && !transPrereqs.includes(f.id)));
      }
    };

    const toggleFollowup = (tid: number) => {
      if (tid === itemId) return; // Selbst-Referenz verhindern
      if (isFollowup(tid)) {
        setFollowups(followups.filter(f => f.id !== tid));
        setPrereqs(prereqs.filter(p => p.id !== tid));
      } else {
        setFollowups([...followups, { id: tid }]);
        setPrereqs(prereqs.filter(p => p.id !== tid));
      }
    };

    const setPrereqGap = (tid: number, gap: string) => {
      setPrereqs(prereqs.map(p => p.id === tid ? { ...p, gapDays: gap ? parseInt(gap) : undefined } : p));
    };

    const setFollowupGap = (tid: number, gap: string) => {
      setFollowups(followups.map(f => f.id === tid ? { ...f, gapDays: gap ? parseInt(gap) : undefined } : f));
    };

    return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <Input placeholder={t("plankiste:taskForm.namePlaceholder")} value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
      <Textarea placeholder={t("plankiste:taskForm.descPlaceholder")} value={desc} onChange={e => setDesc(e.target.value)} className="text-sm resize-none" rows={2} />
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">{t("plankiste:taskForm.dueDays")}</Label>
        <Input type="number" min="0" placeholder={t("plankiste:taskForm.dueDaysPlaceholder")} value={dueDays} onChange={e => setDueDays(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">{t("plankiste:taskForm.frequency")}</Label>
        <Select value={freq} onValueChange={setFreq}>
          <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="once">{t("plankiste:taskItems.frequency.once")}</SelectItem>
            <SelectItem value="daily">{t("plankiste:taskItems.frequency.daily")}</SelectItem>
            <SelectItem value="weekly">{t("plankiste:taskItems.frequency.weekly")}</SelectItem>
            <SelectItem value="monthly">{t("plankiste:taskItems.frequency.monthly")}</SelectItem>
            <SelectItem value="custom">{t("plankiste:taskItems.frequency.custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {freq === "custom" && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">{t("plankiste:taskForm.every")}</Label>
          <Input type="number" min="1" value={repeatInterval} onChange={e => setRepeatInterval(e.target.value)} className="h-7 text-sm w-16" />
          <Select value={repeatUnit} onValueChange={setRepeatUnit}>
            <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="days">{t("plankiste:taskForm.days")}</SelectItem>
              <SelectItem value="weeks">{t("plankiste:taskForm.weeks")}</SelectItem>
              <SelectItem value="months">{t("plankiste:taskForm.months")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">{t("plankiste:taskForm.durationDays")}</Label>
        <Input type="number" min="0" placeholder="0" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-32 flex-shrink-0">{t("plankiste:taskForm.durationMinutes")}</Label>
        <Input type="number" min="0" max="1439" placeholder="0" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="h-7 text-sm flex-1" />
      </div>
      {(members as any[]).length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">{t("plankiste:taskForm.assignedTo")}</Label>
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
          <Label htmlFor={`rot-${mode}-${itemId ?? "new"}`} className="text-xs cursor-pointer">{t("plankiste:taskForm.enableRotation")}</Label>
          {enableRotation && (
            <>
              <Label className="text-xs text-muted-foreground ml-2">{t("plankiste:taskForm.persons")}:</Label>
              <Input type="number" min="1" value={requiredPersons} onChange={e => setRequiredPersons(e.target.value)} className="h-7 text-sm w-16" />
            </>
          )}
        </div>
      )}
      {/* Voraufgaben */}
      {otherTasks.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">{t("plankiste:taskForm.prerequisites")}</Label>
          <div className="flex flex-col gap-1.5">
            {otherTasks.map((task: any) => {
              const transitive = isTransitivePrereq(task.id);
              const blinking = blinkIds.has(task.id);
              const blockerNames = transitive
                ? getBlockingPrereqs(task.id).map((bid: number) => (taskItems as any[]).find((t: any) => t.id === bid)?.name ?? bid).join(", ")
                : "";
              return (
                <div key={task.id} className="flex items-center gap-2">
                  <button type="button"
                    className={`px-2 py-0.5 rounded-full text-xs border transition-all flex-shrink-0 flex items-center gap-1 ${
                      blinking
                        ? "bg-orange-400 border-orange-500 text-white scale-105"
                        : transitive
                        ? "bg-orange-50 border-orange-200 text-orange-600 cursor-not-allowed opacity-80"
                        : isPrereq(task.id)
                        ? "bg-orange-100 border-orange-300 text-orange-700"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                    onClick={() => togglePrereq(task.id)}
                    title={transitive ? `Transitiv erforderlich durch: ${blockerNames}` : undefined}
                  >
                    {transitive && <span className="text-[10px]">🔒</span>}
                    {task.name}
                  </button>
                  {isPrereq(task.id) && !transitive && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" placeholder="0"
                        value={getPrereqGap(task.id)}
                        onChange={e => setPrereqGap(task.id, e.target.value)}
                        className="h-6 text-xs w-14"
                      />
                      <span className="text-xs text-muted-foreground">{t("plankiste:taskForm.gapDays")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Folgeaufgaben */}
      {otherTasks.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground block mb-1">{t("plankiste:taskForm.followups")}</Label>
          <div className="flex flex-col gap-1.5">
            {otherTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-2">
                <button type="button"
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors flex-shrink-0 ${
                    isFollowup(task.id) ? "bg-green-100 border-green-300 text-green-700" : "bg-background border-border text-muted-foreground"
                  }`}
                  onClick={() => toggleFollowup(task.id)}
                >
                  {task.name}
                </button>
                {isFollowup(task.id) && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" min="0" placeholder="0"
                      value={getFollowupGap(task.id)}
                      onChange={e => setFollowupGap(task.id, e.target.value)}
                      className="h-6 text-xs w-14"
                    />
                    <span className="text-xs text-muted-foreground">{t("plankiste:taskForm.gapDays")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 h-7 text-xs" disabled={!name.trim() || isPending} onClick={onSave}>
          <Check className="w-3 h-3 mr-1" />{t("plankiste:taskForm.save")}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />{t("plankiste:taskForm.cancel")}
        </Button>
      </div>
    </div>
    );
  };

  return (
    <>
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {(taskItems as any[]).length === 0
            ? t("plankiste:taskItems.noTasks")
            : (taskItems as any[]).length === 1
              ? t("plankiste:taskItems.tasksCount", { count: 1 })
              : t("plankiste:taskItems.tasksCountPlural", { count: (taskItems as any[]).length })}
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {hasAnyDeps && (taskItems as any[]).length > 1 && (
            <Button
              size="sm" variant={taskSortOrder === "topo" ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setTaskSortOrder(taskSortOrder === "topo" ? "original" : "topo")}
              title={taskSortOrder === "topo" ? "Originalreihenfolge" : "Topologisch sortieren"}
            >
              <GitBranch className="w-3 h-3" />
              {taskSortOrder === "topo" ? t("plankiste:taskItems.sortTopo") : t("plankiste:taskItems.sortOriginal")}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddTask(!showAddTask)}>
            <Plus className="w-3 h-3 mr-1" />{t("plankiste:taskItems.addTask")}
          </Button>
          <Button
            size="sm" variant={showPhasePanel ? "default" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={() => { setShowPhasePanel(!showPhasePanel); setPhaseOrganizeMode(false); }}
          >
            <Layers className="w-3 h-3" />
            Phasen {savedPhases.length > 0 && `(${savedPhases.length})`}
          </Button>
          {savedPhases.length > 0 && (
            <Button
              size="sm" variant={phaseOrganizeMode ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => { setPhaseOrganizeMode(!phaseOrganizeMode); setShowPhasePanel(false); }}
            >
              <Layers className="w-3 h-3" />
              Organisieren
            </Button>
          )}
        </div>
      </div>

      {/* Phasen-Verletzungs-Warnungen */}
      {phaseViolations.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1">
          <p className="text-xs font-medium text-amber-700">⚠ Phasen-Abhängigkeitsfehler:</p>
          {phaseViolations.map((v, i) => (
            <p key={i} className="text-xs text-amber-600">„{v.taskName}": {v.reason}</p>
          ))}
        </div>
      )}

      {/* Phasen-Verwaltungs-Panel */}
      {showPhasePanel && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Phasen ({savedPhases.length}/12)</span>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPhasePanel(false)}>✕</button>
          </div>
          {[...savedPhases].sort((a, b) => a.order - b.order).map(phase => (
            <div
              key={phase.id}
              draggable
              onDragStart={() => setDragPhaseId(phase.id)}
              onDragOver={e => { e.preventDefault(); setDragOverPhaseId(phase.id); }}
              onDrop={() => { if (dragPhaseId) reorderPhase(dragPhaseId, phase.id); setDragPhaseId(null); setDragOverPhaseId(null); }}
              onDragEnd={() => { setDragPhaseId(null); setDragOverPhaseId(null); }}
              className={`flex items-center gap-2 rounded px-1 transition-colors ${dragOverPhaseId === phase.id && dragPhaseId !== phase.id ? 'bg-accent' : ''}`}
            >
              <span className="cursor-grab text-muted-foreground select-none touch-none" title="Halten und ziehen zum Umsortieren">⠿</span>
              <input type="color" value={phase.color} onChange={e => updatePhaseColor(phase.id, e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <input type="text" defaultValue={phase.name} onBlur={e => updatePhaseName(phase.id, e.target.value)} className="flex-1 h-6 text-xs border border-border rounded px-1.5 bg-background" />
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => deletePhase(phase.id)}><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          {savedPhases.length < 12 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <input type="color" value={newPhaseColor} onChange={e => setNewPhaseColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
              <input type="text" value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)} placeholder="Neue Phase..." className="flex-1 h-6 text-xs border border-border rounded px-1.5 bg-background" onKeyDown={e => e.key === "Enter" && addPhase()} />
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={addPhase} disabled={!newPhaseName.trim()}><Plus className="w-3 h-3" /></Button>
            </div>
          )}
          {/* Mobile: Phasen als Chips mit Namen darunter */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border sm:hidden">
            {[...savedPhases].sort((a, b) => a.order - b.order).map(phase => (
              <div key={`chip-${phase.id}`} className="flex flex-col items-center gap-0.5">
                <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: phase.color }} />
                <span className="text-[10px] text-muted-foreground max-w-[48px] truncate">{phase.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

      {/* Phasen-Organisieren-Schnellverfahren */}
      {phaseOrganizeMode && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Klicke auf eine Phase um die Aufgabe zuzuordnen.</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setPhaseOrganizeMode(false)}>✕ Fertig</Button>
          </div>
          {phaseDisplayedTaskItems.map((item: any, idx: number) => {
            const violation = phaseViolations.find(v => v.taskId === item.id);
            return (
              <div key={item.id} className={`rounded border p-2 flex items-center gap-2 ${violation ? 'border-amber-400 bg-amber-50' : 'border-border bg-card'}`}>
                <div className="flex flex-col gap-0.5">
                  <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === 0}
                    onClick={() => updateMutation.mutate({ itemId: item.id, sortOrder: ((phaseDisplayedTaskItems[idx-1] as any)?.sortOrder ?? 0) - 1 })}>
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={idx === phaseDisplayedTaskItems.length - 1}
                    onClick={() => updateMutation.mutate({ itemId: item.id, sortOrder: ((phaseDisplayedTaskItems[idx+1] as any)?.sortOrder ?? 0) + 1 })}>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className="text-sm font-medium break-words">{item.name}</p>
                  {violation && <p className="text-[11px] text-amber-600">⚠ {violation.reason}</p>}
                  <div className="flex flex-wrap gap-1">
                    <button type="button"
                      className={`text-xs px-1.5 py-0.5 rounded border ${!item.phaseId ? 'bg-muted border-border text-foreground font-medium' : 'border-border text-muted-foreground'}`}
                      onClick={() => assignTaskPhase(item.id, null)}>–</button>
                    {[...savedPhases].sort((a, b) => a.order - b.order).map(phase => (
                      <button key={phase.id} type="button"
                        className="text-xs px-1.5 py-0.5 rounded border font-medium"
                        style={{ backgroundColor: item.phaseId === phase.id ? phase.color : phase.color + "22", color: item.phaseId === phase.id ? "#fff" : phase.color, borderColor: phase.color + "66" }}
                        onClick={() => assignTaskPhase(item.id, item.phaseId === phase.id ? null : phase.id)}>
                        {phase.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Normale Aufgaben-Liste */}
      {!phaseOrganizeMode && phaseDisplayedTaskItems.map((item: any) => (
        <div key={item.id} className="rounded-lg border bg-card p-2"
          style={item.phaseId ? { borderLeft: `4px solid ${savedPhases.find(p => p.id === item.phaseId)?.color ?? '#e5e7eb'}` } : { borderColor: 'hsl(var(--border))' }}>
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
                <p className="text-sm font-medium">
                  {enableVariables
                    ? <VarText text={item.name ?? ""} variables={savedVariables} />
                    : item.name}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {enableVariables
                      ? <VarText text={item.description ?? ""} variables={savedVariables} />
                      : item.description}
                  </p>
                )}
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
                  {/* Voraufgaben anzeigen – abwärtskompatibel: altes Format number[], neues Format {id,gapDays}[] */}
                  {(item.prerequisiteItemIds as (number|{id:number;gapDays?:number})[]|null)?.length ? (
                    <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      ⏮ {(item.prerequisiteItemIds as (number|{id:number;gapDays?:number})[]).map((entry) => {
                        const depId = typeof entry === "number" ? entry : entry.id;
                        const depGap = typeof entry === "number" ? undefined : entry.gapDays;
                        const task = (taskItems as any[]).find((x: any) => x.id === depId);
                        const name = task?.name ?? `#${depId}`;
                        return depGap ? `${name} (+${depGap}d)` : name;
                      }).join(", ")}
                    </span>
                  ) : null}
                  {/* Folgeaufgaben anzeigen */}
                  {(item.followupItemIds as (number|{id:number;gapDays?:number})[]|null)?.length ? (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      ⏭ {(item.followupItemIds as (number|{id:number;gapDays?:number})[]).map((entry) => {
                        const depId = typeof entry === "number" ? entry : entry.id;
                        const depGap = typeof entry === "number" ? undefined : entry.gapDays;
                        const task = (taskItems as any[]).find((x: any) => x.id === depId);
                        const name = task?.name ?? `#${depId}`;
                        return depGap ? `${name} (+${depGap}d)` : name;
                      }).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEditTask(item)}>
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmTaskId(item.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
    {/* Übernahme-Dialog: Variablen-Definitionen aus Beschreibungen */}
    <AlertDialog open={showAdoptDialog} onOpenChange={setShowAdoptDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Variablen-Definitionen übernehmen?</AlertDialogTitle>
          <AlertDialogDescription>
            In der Aufgaben-Beschreibung wurden folgende Definitionen gefunden. Du kannst die Formeln noch anpassen:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          {pendingDefinitions.map((d, i) => (
            <div key={d.varName} className="flex items-center gap-2">
              <span className="font-mono font-semibold text-violet-600 text-sm whitespace-nowrap">
                VAR{d.varName} =
              </span>
              <Input
                value={d.formula}
                onChange={e => setPendingDefinitions(prev =>
                  prev.map((p, j) => j === i ? { ...p, formula: e.target.value } : p)
                )}
                className="h-7 text-xs font-mono flex-1"
              />
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setShowAdoptDialog(false); setPendingDefinitions([]); }}>
            Nein, ignorieren
          </AlertDialogCancel>
          <AlertDialogAction onClick={adoptDefinitions}>
            Ja, übernehmen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <PlanVariablesPanel templateId={templateId} householdId={householdId} memberId={memberId} />
    {/* Lösch-Bestätigungs-Dialog */}
    <AlertDialog open={deleteConfirmTaskId !== null} onOpenChange={open => { if (!open) setDeleteConfirmTaskId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {(() => {
              const task = (taskItems as any[]).find((t: any) => t.id === deleteConfirmTaskId);
              const deps = (taskItems as any[]).filter((t: any) =>
                (t.prerequisiteItemIds ?? []).some((e: any) => (typeof e === "number" ? e : e.id) === deleteConfirmTaskId) ||
                (t.followupItemIds ?? []).some((e: any) => (typeof e === "number" ? e : e.id) === deleteConfirmTaskId)
              );
              return (
                <>
                  <span>„{task?.name}" wird unwiderruflich gelöscht.</span>
                  {deps.length > 0 && (
                    <span className="block mt-1 text-amber-600">
                      Wird auch aus {deps.length} Aufgabe{deps.length > 1 ? "n" : ""} als Vor-/Folgeaufgabe entfernt: {deps.map((d: any) => `„${d.name}"`).join(", ")}.
                    </span>
                  )}
                </>
              );
            })()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteConfirmTaskId(null)}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => {
            const id = deleteConfirmTaskId!;
            (taskItems as any[]).forEach((t: any) => {
              const hasPrereq = (t.prerequisiteItemIds ?? []).some((e: any) => (typeof e === "number" ? e : e.id) === id);
              const hasFollowup = (t.followupItemIds ?? []).some((e: any) => (typeof e === "number" ? e : e.id) === id);
              if (hasPrereq || hasFollowup) {
                updateMutation.mutate({
                  itemId: t.id,
                  prerequisiteItemIds: (t.prerequisiteItemIds ?? []).filter((e: any) => (typeof e === "number" ? e : e.id) !== id),
                  followupItemIds: (t.followupItemIds ?? []).filter((e: any) => (typeof e === "number" ? e : e.id) !== id),
                });
              }
            });
            deleteMutation.mutate({ itemId: id });
            setDeleteConfirmTaskId(null);
          }}>Löschen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
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
  const { t } = useTranslation(["plankiste"]);
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TemplateType>("shopping");

  // State korrekt vorausfüllen wenn Dialog öffnet oder template wechselt
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setType(template?.type ?? "shopping");
    }
  }, [open, template?.id, template?.name, template?.description, template?.type]);

  const createMutation = trpc.planTemplates.createTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success(t("plankiste:templateForm.created"));
      onClose();
    },
    onError: () => toast.error(t("plankiste:templateForm.createError")),
  });

  const updateMutation = trpc.planTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      utils.planTemplates.listTemplates.invalidate({ householdId });
      toast.success(t("plankiste:templateForm.saved"));
      onClose();
    },
    onError: () => toast.error(t("plankiste:templateForm.saveError")),
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? t("plankiste:templateForm.editTitle") : t("plankiste:templateForm.createTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("plankiste:templateForm.nameLabel")} *</Label>
            <Input
              placeholder={t("plankiste:templateForm.namePlaceholder")}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("plankiste:templateForm.descriptionLabel")}</Label>
            <Textarea
              placeholder={t("plankiste:templateForm.descriptionPlaceholder")}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("plankiste:templateForm.typeLabel")}</Label>
            <Select value={type} onValueChange={v => setType(v as TemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopping">{t("plankiste:templateForm.typeShopping")}</SelectItem>
                <SelectItem value="tasks">{t("plankiste:templateForm.typeTasks")}</SelectItem>
                <SelectItem value="mixed">{t("plankiste:templateForm.typeMixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("plankiste:templateForm.cancel")}</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {template ? t("plankiste:templateForm.save") : t("plankiste:templateForm.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aktive Pläne Tab ─────────────────────────────────────────────────────────
function InstancesTab({ householdId, memberId }: { householdId: number; memberId: number }) {
  const { t } = useTranslation("plankiste");
  const utils = trpc.useUtils();
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("date_desc");

  const { data: instances = [], isLoading } = trpc.planTemplates.listInstances.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const completeMutation = trpc.planTemplates.completeInstance.useMutation({
    onSuccess: () => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success(t("instances.completed"));
    },
  });

  const cancelMutation = trpc.planTemplates.cancelInstance.useMutation({
    onSuccess: () => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success(t("instances.cancelled"));
    },
  });

  const allSorted = sortItems(
    (instances as any[]).map((i: any) => ({ ...i, name: i.label ?? i.templateName ?? "" })),
    sort
  );
  const activeInstances = allSorted.filter((i: any) => i.status === "active");
  const doneInstances = allSorted.filter((i: any) => i.status !== "active");

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
      {instances.length > 1 && (
        <div className="flex justify-end">
          <SortBar sort={sort} onChange={setSort} />
        </div>
      )}
      {activeInstances.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("instances.sectionActive")}</h3>
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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("instances.sectionDone")}</h3>
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
  const { t } = useTranslation("plankiste");
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
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">{t("instances.statusCompleted")}</Badge>
              )}
              {instance.status === "cancelled" && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">{t("instances.statusCancelled")}</Badge>
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
                  {t("instances.tabShopping", { count: instance.totalShoppingItems })}
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "tasks" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("tasks")}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {t("instances.tabTasks", { count: instance.totalTaskItems })}
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
                  {t("instances.completePlan")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={onCancel}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t("instances.cancelPlan")}
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
  const { t } = useTranslation("plankiste");
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
      toast.success(t("instances.itemTransferred"));
    },
    onError: () => toast.error(t("instances.transferError")),
  });

  const untransferMutation = trpc.planTemplates.untransferItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.shopping.list.invalidate({ householdId });
      toast.success(t("instances.undone"));
    },
    onError: () => toast.error(t("instances.transferError")),
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
          {t("instances.addToShoppingList", { count: pendingItems.length })}
        </Button>
      )}

      {/* Ausstehende Artikel */}
      {pendingItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("instances.pendingItems")}</p>
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
                    {t("instances.transferItem")}
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
          <p className="text-xs font-medium text-muted-foreground">{t("instances.transferredItems")}</p>
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
            {t("instances.completePlan")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t("instances.cancelPlan")}
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
  const { t } = useTranslation("plankiste");
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
      toast.success(t("instances.taskTransferred"));
    },
    onError: () => toast.error(t("instances.transferError")),
  });

  const untransferTaskMutation = trpc.planTemplates.untransferTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.tasks.list.invalidate({ householdId });
      toast.success(t("instances.undone"));
    },
    onError: () => toast.error(t("instances.transferError")),
  });

  const taskItems = instance?.taskItems ?? [];
  const pendingTasks = taskItems.filter((item: any) => !item.isTransferred);
  const transferredTasks = taskItems.filter((item: any) => item.isTransferred);

  const FREQ_LABELS: Record<string, string> = {
    once: t("taskItems.frequency.once"),
    daily: t("taskItems.frequency.daily"),
    weekly: t("taskItems.frequency.weekly"),
    monthly: t("taskItems.frequency.monthly"),
    custom: t("taskItems.frequency.custom"),
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
          {pendingTasks.length === 1
            ? t("instances.transferAllTasksBtn", { count: 1 })
            : t("instances.transferAllTasksBtnPlural", { count: pendingTasks.length })}
        </Button>
      )}

      {/* Ausstehende Aufgaben */}
      {pendingTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("instances.pendingTasks")}</p>
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
                    {t("instances.dueDaysLabel", { days: task.dueDaysFromStart })}
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
                  {t("instances.transferItem")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Übertragene Aufgaben */}
      {transferredTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("instances.transferredTasks")}</p>
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
            {t("instances.completePlan")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t("instances.cancelPlan")}
          </Button>
        </div>
      )}
    </div>
  );
}
import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * TaskCategorySelector
 * Mehrfachauswahl für Aufgaben-Kategorien mit Neu-Erstellen-Button.
 * Wird im Aufgaben-Formular (Erstellen + Bearbeiten) eingesetzt.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Tag } from "lucide-react";
import { toast } from "sonner";

// Vordefinierte Farben zur Auswahl
const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
  "#6B7280", "#78716C",
];

interface TaskCategorySelectorProps {
  householdId: number;
  memberId: number;
  selectedCategoryIds: number[];
  onChange: (ids: number[]) => void;
}

export function TaskCategorySelector({
  householdId,
  memberId,
  selectedCategoryIds,
  onChange,
}: TaskCategorySelectorProps) {
  const { t } = useTranslation("tasks");
  const utils = trpc.useUtils();

  // Dialog-State für neue Kategorie
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[5]); // Blau als Standard

  // Kategorien laden – nutzt die gemeinsamen shopping_categories des Haushalts
  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId },
    { enabled: !!householdId }
  );

  // Neue Kategorie erstellen – legt sie in shopping_categories an (haushaltsweit)
  const createMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: (data) => {
      utils.shopping.listCategories.invalidate({ householdId });
      utils.tasks.listCategories.invalidate({ householdId });
      // Neu erstellte Kategorie direkt auswählen
      onChange([...selectedCategoryIds, data.categoryId]);
      setNewCatName("");
      setNewCatColor(PRESET_COLORS[5]);
      setShowCreateDialog(false);
      toast.success(t("categories.createSuccess", "Kategorie erstellt"));
    },
    onError: () => {
      toast.error(t("categories.createError", "Kategorie konnte nicht erstellt werden"));
    },
  });

  const handleToggleCategory = (catId: number) => {
    if (selectedCategoryIds.includes(catId)) {
      onChange(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      onChange([...selectedCategoryIds, catId]);
    }
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    createMutation.mutate({
      householdId,
      memberId,
      name: newCatName.trim(),
      color: newCatColor,
    });
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        {t("categories.label", "Kategorien")}{" "}
        <span className="text-muted-foreground text-xs">
          ({t("common:labels.optional", "optional")})
        </span>
      </Label>

      {/* Ausgewählte Kategorien als Badges */}
      {selectedCategoryIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selectedCategoryIds.map((id) => {
            const cat = categories.find((c) => c.id === id);
            if (!cat) return null;
            return (
              <Badge
                key={id}
                style={{ backgroundColor: cat.color, color: "#fff" }}
                className="flex items-center gap-1 pr-1 cursor-pointer"
                onClick={() => handleToggleCategory(id)}
              >
                {cat.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Kategorie-Auswahl-Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isSelected = selectedCategoryIds.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleToggleCategory(cat.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                isSelected
                  ? "ring-2 ring-offset-1 opacity-100"
                  : "opacity-60 hover:opacity-90"
              }`}
              style={{
                borderColor: cat.color,
                color: isSelected ? "#fff" : cat.color,
                backgroundColor: isSelected ? cat.color : "transparent",
                ...(isSelected ? { ringColor: cat.color } : {}),
              }}
            >
              {cat.name}
            </button>
          );
        })}

        {/* Neue Kategorie erstellen */}
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-dashed border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          {t("categories.new", "Neu")}
        </button>
      </div>

      {/* Dialog: Neue Kategorie erstellen */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("categories.createTitle", "Neue Kategorie")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newCatName">{t("categories.nameLabel", "Name")}</Label>
              <Input
                id="newCatName"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("categories.namePlaceholder", "z. B. Dringend")}
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("categories.colorLabel", "Farbe")}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      newCatColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              type="button"
            >
              {t("common:actions.cancel", "Abbrechen")}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || createMutation.isPending}
              type="button"
            >
              {createMutation.isPending
                ? t("common:status.saving", "Speichern...")
                : t("common:actions.create", "Erstellen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

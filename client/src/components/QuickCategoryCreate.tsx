import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface QuickCategoryCreateProps {
  householdId: number;
  memberId: number;
  onCategoryCreated: (categoryId: number) => void;
  type?: "shopping" | "inventory";
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e"
];

export function QuickCategoryCreate({ householdId, memberId, onCategoryCreated, type = "shopping" }: QuickCategoryCreateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const { t } = useTranslation();
  
  const utils = trpc.useUtils();
  
  const createMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: (data) => {
      utils.shopping.listCategories.invalidate();
      toast.success(t("common:category.create.success", { name }));
      onCategoryCreated(data.categoryId);
      setOpen(false);
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
    },
    onError: (error: any) => {
      toast.error(error.message || t("common:category.create.error"));
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMutation.mutate({
      householdId,
      memberId,
      name: name.trim(),
      color: selectedColor,
    });
  };
  
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setOpen(true)}
        title={t("common:category.create.buttonTitle")}
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common:category.create.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("common:category.create.dialogDescription", {
                type: type === "shopping" ? t("common:category.type.shopping") : t("common:category.type.inventory"),
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">{t("common:category.nameLabel")}</Label>
                <Input
                  id="categoryName"
                  placeholder={t("common:category.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common:category.colorLabel")}</Label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("common:button.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name.trim()}
              >
                {createMutation.isPending ? t("common:button.creating") : t("common:button.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

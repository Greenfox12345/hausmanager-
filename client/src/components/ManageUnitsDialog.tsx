import { useState } from "react";
import { Pencil, Trash2, Plus, Ruler } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

interface ManageUnitsDialogProps {
  householdId: number;
  trigger?: React.ReactNode;
}

export function ManageUnitsDialog({ householdId, trigger }: ManageUnitsDialogProps) {
  const { t } = useTranslation(["units", "common"]);
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: units = [], isLoading } = trpc.units.list.useQuery(
    { householdId },
    { enabled: open }
  );

  const seedMutation = trpc.units.seedDefaults.useMutation({
    onSuccess: () => utils.units.list.invalidate({ householdId }),
  });

  const addMutation = trpc.units.add.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setNewName("");
      setNewSymbol("");
      toast.success(t("units:addedSuccess", "Einheit hinzugefügt"));
    },
    onError: () => toast.error(t("common:error", "Fehler")),
  });

  const updateMutation = trpc.units.update.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setEditingId(null);
      toast.success(t("units:updatedSuccess", "Einheit aktualisiert"));
    },
    onError: () => toast.error(t("common:error", "Fehler")),
  });

  const deleteMutation = trpc.units.delete.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setDeleteId(null);
      toast.success(t("units:deletedSuccess", "Einheit gelöscht"));
    },
    onError: () => toast.error(t("common:error", "Fehler")),
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && units.length === 0) {
      // Auto-seed defaults if none exist yet
      seedMutation.mutate({ householdId });
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMutation.mutate({ householdId, name: newName.trim(), symbol: newSymbol.trim() || undefined });
  };

  const startEdit = (unit: { id: number; name: string; symbol?: string | null }) => {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditSymbol(unit.symbol ?? "");
  };

  const handleUpdate = () => {
    if (editingId === null || !editName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      householdId,
      name: editName.trim(),
      symbol: editSymbol.trim() || null,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Ruler className="h-4 w-4" />
              {t("units:manage", "Einheiten verwalten")}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              {t("units:title", "Einheiten")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing units list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t("common:loading", "Laden…")}</p>
              ) : units.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("units:empty", "Keine Einheiten vorhanden")}</p>
              ) : (
                units.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-2">
                    {editingId === unit.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={t("units:name", "Name")}
                          className="flex-1 h-8 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                        />
                        <Input
                          value={editSymbol}
                          onChange={(e) => setEditSymbol(e.target.value)}
                          placeholder={t("units:symbol", "Kürzel")}
                          className="w-20 h-8 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                        />
                        <Button size="sm" className="h-8 px-2" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          {t("common:save", "Speichern")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}>
                          {t("common:cancel", "Abbrechen")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{unit.name}</span>
                        {unit.symbol && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {unit.symbol}
                          </span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(unit)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(unit.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add new unit */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-sm font-medium">{t("units:addNew", "Neue Einheit")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("units:namePlaceholder", "z. B. Liter")}
                  className="flex-1 h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder={t("units:symbolPlaceholder", "z. B. l")}
                  className="w-20 h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <Button
                  size="sm"
                  className="h-9 gap-1"
                  onClick={handleAdd}
                  disabled={!newName.trim() || addMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {t("common:add", "Hinzufügen")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("units:deleteTitle", "Einheit löschen?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("units:deleteDesc", "Diese Einheit wird von allen zugehörigen Einträgen entfernt.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel", "Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId, householdId })}
            >
              {t("common:delete", "Löschen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

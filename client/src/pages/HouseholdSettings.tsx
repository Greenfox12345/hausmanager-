import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Globe,
  Settings,
  Users,
  Lock,
  ChevronLeft,
  Tag,
  Ruler,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n";
import { useLocation } from "wouter";

// ─── Preset colors for categories ────────────────────────────────────────────
const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#6B7280",
];

export default function HouseholdSettings() {
  const { t } = useTranslation(["common", "units", "household"]);
  const { currentHousehold } = useUserAuth();
  const { member } = useCompatAuth();
  const [, setLocation] = useLocation();

  const householdId = currentHousehold?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;

  const utils = trpc.useUtils();

  // ── Household settings ─────────────────────────────────────────────────────
  const { data: settings, refetch: refetchSettings } = trpc.householdManagement.getHouseholdSettings.useQuery(
    { householdId },
    { enabled: !!householdId }
  );

  const updateLanguageMutation = trpc.householdManagement.updateHouseholdLanguage.useMutation({
    onSuccess: () => {
      toast.success(t("common:household.settings.saved"));
      refetchSettings();
    },
    onError: () => toast.error(t("common:household.settings.saveError")),
  });

  const handleLanguageChange = (code: SupportedLanguageCode) => {
    if (!householdId) return;
    updateLanguageMutation.mutate({ householdId, language: code });
  };

  const currentHouseholdLang = settings?.language || "de";
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentHouseholdLang);

  // ── Categories ─────────────────────────────────────────────────────────────
  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId },
    { enabled: !!householdId }
  );

  // New category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  // Inline edit state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");

  // Delete confirm
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  const createCategoryMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate({ householdId });
      setNewCatName("");
      setNewCatColor(PRESET_COLORS[0]);
      toast.success(t("common:household.settings.categoryAdded", "Kategorie hinzugefügt"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const renameCategoryMutation = trpc.shopping.renameCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate({ householdId });
      setEditingCatId(null);
      toast.success(t("common:household.settings.categoryUpdated", "Kategorie aktualisiert"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const deleteCategoryMutation = trpc.shopping.deleteCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate({ householdId });
      setDeleteCatId(null);
      toast.success(t("common:household.settings.categoryDeleted", "Kategorie gelöscht"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const startEditCat = (cat: { id: number; name: string; color?: string | null }) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color ?? PRESET_COLORS[0]);
  };

  const saveEditCat = () => {
    if (!editCatName.trim() || editingCatId === null) return;
    renameCategoryMutation.mutate({
      categoryId: editingCatId,
      householdId,
      memberId,
      name: editCatName.trim(),
      color: editCatColor,
    });
  };

  // ── Units ──────────────────────────────────────────────────────────────────
  const { data: units = [], isLoading: unitsLoading } = trpc.units.list.useQuery(
    { householdId },
    { enabled: !!householdId }
  );

  const seedUnitsMutation = trpc.units.seedDefaults.useMutation({
    onSuccess: () => utils.units.list.invalidate({ householdId }),
  });

  // New unit form state
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");

  // Inline edit state
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editUnitName, setEditUnitName] = useState("");
  const [editUnitSymbol, setEditUnitSymbol] = useState("");

  // Delete confirm
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);

  const addUnitMutation = trpc.units.add.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setNewUnitName("");
      setNewUnitSymbol("");
      toast.success(t("units:addedSuccess"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const updateUnitMutation = trpc.units.update.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setEditingUnitId(null);
      toast.success(t("units:updatedSuccess"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const deleteUnitMutation = trpc.units.delete.useMutation({
    onSuccess: () => {
      utils.units.list.invalidate({ householdId });
      setDeleteUnitId(null);
      toast.success(t("units:deletedSuccess"));
    },
    onError: () => toast.error(t("common:error")),
  });

  const startEditUnit = (unit: { id: number; name: string; symbol?: string | null }) => {
    setEditingUnitId(unit.id);
    setEditUnitName(unit.name);
    setEditUnitSymbol(unit.symbol ?? "");
  };

  const saveEditUnit = () => {
    if (!editUnitName.trim() || editingUnitId === null) return;
    updateUnitMutation.mutate({
      id: editingUnitId,
      householdId,
      name: editUnitName.trim(),
      symbol: editUnitSymbol.trim() || null,
    });
  };

  // ── Seed units if none exist ───────────────────────────────────────────────
  const [unitsSeedAttempted, setUnitsSeedAttempted] = useState(false);
  if (householdId && !unitsLoading && !unitsSeedAttempted && units.length === 0) {
    setUnitsSeedAttempted(true);
    seedUnitsMutation.mutate({ householdId });
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!householdId) {
    return (
      <AppLayout>
        <div className="container py-8">
          <p className="text-muted-foreground">{t("common:household.select")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6" />
              {t("common:household.settings.title", "Einstellungen")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {settings?.name || currentHousehold?.householdName}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── UI Language ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {t("common:language.uiLanguage")}
              </CardTitle>
              <CardDescription>{t("common:language.uiLanguageHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("common:language.select")}:</span>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          {/* ── Household Language ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {t("common:household.language")}
              </CardTitle>
              <CardDescription>{t("common:household.languageHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {settings?.isAdmin ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">{t("common:labels.language")}:</span>
                    <Badge variant="outline">
                      {currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={currentHouseholdLang === lang.code ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLanguageChange(lang.code)}
                        disabled={updateLanguageMutation.isPending}
                        className="justify-start gap-2"
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {currentHouseholdLang === lang.code && <span className="ml-auto text-xs">✓</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm">
                      {t("common:labels.language")}: <strong>{currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}</strong>
                    </p>
                    <p className="text-xs mt-1">
                      {t("common:household.settings.onlyAdminCanChange", "Nur der Haushaltsersteller kann die Haushaltssprache ändern.")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* ── Categories ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                {t("common:household.settings.categories", "Kategorien")}
              </CardTitle>
              <CardDescription>
                {t("common:household.settings.categoriesHint", "Kategorien für Einkaufsliste und Inventar verwalten")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing categories */}
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("common:household.settings.noCategories", "Noch keine Kategorien vorhanden.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                      {editingCatId === cat.id ? (
                        /* ── Inline edit row ── */
                        <>
                          <Input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && saveEditCat()}
                            autoFocus
                          />
                          {/* Color swatches */}
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${editCatColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setEditCatColor(c)}
                              />
                            ))}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={saveEditCat}
                            disabled={renameCategoryMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingCatId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        /* ── Display row ── */
                        <>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border"
                            style={{
                              backgroundColor: cat.color ? `${cat.color}20` : undefined,
                              color: cat.color ?? undefined,
                              borderColor: cat.color ? `${cat.color}40` : undefined,
                            }}
                          >
                            {cat.name}
                          </span>
                          <span className="flex-1" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEditCat(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new category */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium">
                  {t("common:household.settings.newCategory", "Neue Kategorie")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t("common:household.settings.categoryNamePlaceholder", "z. B. Getränke")}
                    className="flex-1 h-9"
                    onKeyDown={(e) => e.key === "Enter" && newCatName.trim() && createCategoryMutation.mutate({ householdId, memberId, name: newCatName.trim(), color: newCatColor })}
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1"
                    disabled={!newCatName.trim() || createCategoryMutation.isPending}
                    onClick={() => createCategoryMutation.mutate({ householdId, memberId, name: newCatName.trim(), color: newCatColor })}
                  >
                    <Plus className="h-4 w-4" />
                    {t("common:add")}
                  </Button>
                </div>
                {/* Color picker */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${newCatColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewCatColor(c)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Units ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-4 w-4" />
                {t("units:title")}
              </CardTitle>
              <CardDescription>
                {t("common:household.settings.unitsHint", "Einheiten für Mengenangaben haushaltsweit verwalten")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing units */}
              {unitsLoading ? (
                <p className="text-sm text-muted-foreground">{t("common:loading")}</p>
              ) : units.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("units:empty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                      {editingUnitId === unit.id ? (
                        /* ── Inline edit row ── */
                        <>
                          <Input
                            value={editUnitName}
                            onChange={(e) => setEditUnitName(e.target.value)}
                            placeholder={t("units:name")}
                            className="flex-1 h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && saveEditUnit()}
                            autoFocus
                          />
                          <Input
                            value={editUnitSymbol}
                            onChange={(e) => setEditUnitSymbol(e.target.value)}
                            placeholder={t("units:symbol")}
                            className="w-20 h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && saveEditUnit()}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={saveEditUnit}
                            disabled={updateUnitMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingUnitId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        /* ── Display row ── */
                        <>
                          <span className="flex-1 text-sm font-medium">{unit.name}</span>
                          {unit.symbol && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                              {unit.symbol}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEditUnit(unit)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteUnitId(unit.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new unit */}
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-medium">{t("units:addNew")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder={t("units:namePlaceholder")}
                    className="flex-1 h-9"
                    onKeyDown={(e) => e.key === "Enter" && newUnitName.trim() && addUnitMutation.mutate({ householdId, name: newUnitName.trim(), symbol: newUnitSymbol.trim() || undefined })}
                  />
                  <Input
                    value={newUnitSymbol}
                    onChange={(e) => setNewUnitSymbol(e.target.value)}
                    placeholder={t("units:symbolPlaceholder")}
                    className="w-20 h-9"
                    onKeyDown={(e) => e.key === "Enter" && newUnitName.trim() && addUnitMutation.mutate({ householdId, name: newUnitName.trim(), symbol: newUnitSymbol.trim() || undefined })}
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1"
                    disabled={!newUnitName.trim() || addUnitMutation.isPending}
                    onClick={() => addUnitMutation.mutate({ householdId, name: newUnitName.trim(), symbol: newUnitSymbol.trim() || undefined })}
                  >
                    <Plus className="h-4 w-4" />
                    {t("common:add")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* ── Info Card ── */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>{t("common:household.settings.general", "Haushalt")}:</strong> {settings?.name}
              </p>
              {settings?.inviteCode && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{t("common:household.inviteCode")}:</strong>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                    {settings.inviteCode}
                  </code>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Delete Category Confirm ── */}
      <AlertDialog open={deleteCatId !== null} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:household.settings.deleteCategoryTitle", "Kategorie löschen?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common:household.settings.deleteCategoryDesc", "Die Kategorie wird von allen zugehörigen Einträgen entfernt.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteCatId !== null && deleteCategoryMutation.mutate({ categoryId: deleteCatId, householdId, memberId })}
            >
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Unit Confirm ── */}
      <AlertDialog open={deleteUnitId !== null} onOpenChange={(o) => !o && setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("units:deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("units:deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteUnitId !== null && deleteUnitMutation.mutate({ id: deleteUnitId, householdId })}
            >
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

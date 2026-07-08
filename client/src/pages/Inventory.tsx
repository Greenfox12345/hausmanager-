import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Filter, Edit2, FolderPlus, Package, Image, ImageOff, Minus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { compressImage } from "@/lib/imageCompression";
import { QuantityInput, formatQuantityWithUnit, type UnitOption } from "@/components/QuantityInput";
import { ManageUnitsDialog } from "@/components/ManageUnitsDialog";

// Helper function to normalize photoUrls to object format
const normalizePhotoUrls = (photoUrls: any): Array<{ url: string; filename: string }> => {
  if (!photoUrls || !Array.isArray(photoUrls)) return [];
  
  return photoUrls.map((item: any) => {
    // If already in object format
    if (typeof item === 'object' && item.url && item.filename) {
      return item;
    }
    // If in old string format, convert to object format
    if (typeof item === 'string') {
      const filename = item.split('/').pop() || 'unknown.jpg';
      return { url: item, filename };
    }
    // Fallback
    return { url: String(item), filename: 'unknown.jpg' };
  });
};

export default function Inventory() {
  const { t } = useTranslation(["inventory", "common"]);
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();

  // State
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterOwner, setFilterOwner] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Category management state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Item creation state
  const [newItemName, setNewItemName] = useState("");
  const [newItemDetails, setNewItemDetails] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState<number | null>(null);
  const [newItemOwnershipType, setNewItemOwnershipType] = useState<"personal" | "household">("household");
  const [newItemOwnerIds, setNewItemOwnerIds] = useState<number[]>([]);
  const [newItemPhotos, setNewItemPhotos] = useState<{url: string, filename: string}[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newItemQuantity, setNewItemQuantity] = useState<number | null>(null);
  const [newItemUnitId, setNewItemUnitId] = useState<number | null>(null);

  // View options
  const [showImages, setShowImages] = useState(true);

  // Unit filter
  const [filterUnit, setFilterUnit] = useState<number | null>(null);

  // Quick-edit quantity state: maps itemId → pending quantity
  const [quickEditQty, setQuickEditQty] = useState<Record<number, number>>({});

  const utils = trpc.useUtils();

  const { data: units = [] } = trpc.units.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const seedUnitsMutation = trpc.units.seedDefaults.useMutation();
  const [unitsSeedAttempted, setUnitsSeedAttempted] = useState(false);
  if (household && !unitsSeedAttempted && units.length === 0) {
    setUnitsSeedAttempted(true);
    seedUnitsMutation.mutate({ householdId: household.householdId });
  }

  const { data: items = [], isLoading } = trpc.inventory.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Get pending borrow requests per item
  const { data: pendingRequestsByItem = [] } = trpc.borrow.getPendingRequestsByItem.useQuery(
    {
      householdId: household?.householdId ?? 0,
      ownerId: member?.memberId ?? 0,
    },
    {
      enabled: !!household && !!member,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Create a map for quick lookup
  const pendingCountMap = new Map(
    pendingRequestsByItem.map((item: any) => [item.itemId, item.count])
  );

  const addCategoryMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
      toast.success(t("inventory:messages.categoryAdded", "Kategorie hinzugefügt"));
    },
    onError: () => {
      toast.error(t("inventory:messages.categoryCreateError"));
    },
  });

  const updateCategoryMutation = trpc.shopping.renameCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setEditingCategory(null);
      toast.success(t("inventory:messages.categoryUpdated", "Kategorie aktualisiert"));
    },
    onError: () => {
      toast.error(t("inventory:messages.updateError"));
    },
  });

  const deleteCategoryMutation = trpc.shopping.deleteCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      toast.success(t("inventory:messages.categoryDeleted", "Kategorie gelöscht"));
    },
    onError: () => {
      toast.error(t("inventory:messages.deleteError"));
    },
  });

  const uploadMutation = trpc.upload.uploadPhoto.useMutation({
    onSuccess: (data: { url: string, filename: string }) => {
      setNewItemPhotos([...newItemPhotos, { url: data.url, filename: data.filename }]);
      setUploadingPhoto(false);
      toast.success(t("inventory:messages.photoUploaded", "Foto hochgeladen"));
    },
    onError: (error: any) => {
      setUploadingPhoto(false);
      toast.error(t("inventory:messages.photoUploadError"));
    },
  });

  const addItemMutation = trpc.inventory.add.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      setShowAddDialog(false);
      setNewItemName("");
      setNewItemDetails("");
      setNewItemCategoryId(null);
      setNewItemOwnershipType("household");
      setNewItemOwnerIds([]);
      setNewItemPhotos([]);
      setNewItemQuantity(null);
      setNewItemUnitId(null);
      toast.success(t("inventory:messages.itemAdded", "Artikel hinzugefügt"));
    },
    onError: () => {
      toast.error(t("inventory:messages.createError"));
    },
  });

  const updateItemMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
    },
    onError: () => {
      toast.error(t("inventory:messages.updateError"));
    },
  });

  const deleteItemMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      toast.success(t("inventory:messages.itemDeleted", "Artikel gelöscht"));
    },
    onError: () => {
      toast.error(t("inventory:messages.deleteError"));
    },
  });

  if (!isAuthenticated || !household || !member) {
    return null;
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    addCategoryMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    updateCategoryMutation.mutate({
      categoryId: editingCategory.id,
      householdId: household.householdId,
      memberId: member.memberId,
      name: editingCategory.name,
      color: editingCategory.color,
    });
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm(t("common:messages.confirmDelete", "Kategorie wirklich löschen?"))) {
      deleteCategoryMutation.mutate({ 
        categoryId, 
        householdId: household.householdId, 
        memberId: member.memberId 
      });
    }
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm(t("common:messages.confirmDelete", "Artikel wirklich löschen?"))) {
      deleteItemMutation.mutate({ itemId, householdId: household.householdId, memberId: member.memberId });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (newItemPhotos.length >= 5) {
      toast.error(t("inventory:messages.maxPhotos", "Maximal 5 Fotos erlaubt"));
      return;
    }

    setUploadingPhoto(true);
    
    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        uploadMutation.mutate({
          photo: base64,
          filename: compressedFile.name,
        });
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Compression error:', error);
      toast.error(t("inventory:messages.compressionError", 'Fehler beim Komprimieren des Bildes'));
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setNewItemPhotos(newItemPhotos.filter((_, i) => i !== index));
  };

  const handleToggleOwner = (memberId: number) => {
    if (newItemOwnerIds.includes(memberId)) {
      setNewItemOwnerIds(newItemOwnerIds.filter(id => id !== memberId));
    } else {
      setNewItemOwnerIds([...newItemOwnerIds, memberId]);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategoryId) {
      toast.error(t("inventory:messages.nameCategoryRequired", "Name und Kategorie sind erforderlich"));
      return;
    }

    if (newItemOwnershipType === 'personal' && newItemOwnerIds.length === 0) {
      toast.error(t("inventory:messages.selectOwner", "Bitte wähle mindestens einen Eigentümer"));
      return;
    }

    addItemMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: newItemName.trim(),
      details: newItemDetails.trim() || undefined,
      categoryId: newItemCategoryId,
      photoUrls: newItemPhotos,
      ownershipType: newItemOwnershipType,
      ownerIds: newItemOwnershipType === 'personal' ? newItemOwnerIds : undefined,
      quantity: newItemQuantity,
      unitId: newItemUnitId,
    });
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory && item.categoryId !== filterCategory) return false;
    if (filterOwner) {
      if (item.ownershipType === 'household') return false;
      if (!item.owners.some((o: any) => o.memberId === filterOwner)) return false;
    }
    if (filterUnit !== null) {
      if (filterUnit === -1) {
        // Only items without a unit
        if (item.unitId != null) return false;
      } else {
        if (item.unitId !== filterUnit) return false;
      }
    }
    return true;
  });

  /** Adaptive step size matching QuantityInput behavior */
  function getStep(value: number): number {
    if (value >= 1000) return 500;
    if (value >= 100) return 50;
    return 1;
  }

  /** Adjust quantity of an inventory item directly from the card */
  const quickAdjustQty = (item: any, delta: number) => {
    const currentQty = quickEditQty[item.id] ?? (item.quantity ?? 0);
    const step = getStep(Math.abs(currentQty));
    const newQty = Math.max(0, currentQty + delta * step);
    setQuickEditQty((prev) => ({ ...prev, [item.id]: newQty }));
    updateItemMutation.mutate({
      itemId: item.id,
      householdId: household!.householdId,
      memberId: member!.memberId,
      quantity: newQty,
    });
  };

  const getCategoryStyle = (color: string) => {
    return {
      backgroundColor: color + '20',
      borderColor: color,
      color: color,
    };
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
        <PageHeader
          icon={Package}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          title={t('inventory:title')}
        />
        <div className="flex items-center gap-2 -mt-4 mb-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory:newItem')}
          </Button>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Filter className="h-4 w-4 mr-2" />
                {t('common:actions.filter')}
              </CardTitle>
              {/* View toggle: images on/off */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImages((v) => !v)}
                title={showImages ? t('inventory:filter.hideImages', 'Bilder ausblenden') : t('inventory:filter.showImages', 'Bilder anzeigen')}
                className="gap-1.5"
              >
                {showImages ? <ImageOff className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {showImages ? t('inventory:filter.hideImages', 'Ohne Bilder') : t('inventory:filter.showImages', 'Mit Bildern')}
                </span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>{t('inventory:fields.category')}</Label>
              <Select
                value={filterCategory?.toString() || 'all'}
                onValueChange={(value) => setFilterCategory(value === 'all' ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory:filter.allCategories', 'Alle Kategorien')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('inventory:filter.allCategories', 'Alle Kategorien')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('inventory:fields.owner')}</Label>
              <Select
                value={filterOwner?.toString() || 'all'}
                onValueChange={(value) => setFilterOwner(value === 'all' ? null : value === 'household' ? 0 : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory:filter.allOwners', 'Alle Eigentümer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('inventory:filter.allOwners', 'Alle Eigentümer')}</SelectItem>
                  <SelectItem value="household">{t('inventory:filter.onlyHousehold', 'Nur Haushalt')}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.memberName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('inventory:filter.unit', 'Einheit')}</Label>
              <Select
                value={filterUnit === null ? 'all' : filterUnit === -1 ? 'none' : filterUnit.toString()}
                onValueChange={(value) => {
                  if (value === 'all') setFilterUnit(null);
                  else if (value === 'none') setFilterUnit(-1);
                  else setFilterUnit(Number(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inventory:filter.allUnits', 'Alle Einheiten')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('inventory:filter.allUnits', 'Alle Einheiten')}</SelectItem>
                  <SelectItem value="none">{t('inventory:filter.noUnit', 'Ohne Einheit')}</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}{u.symbol ? ` (${u.symbol})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          {/* Management buttons row */}
          <div className="px-6 pb-4 flex items-center gap-2">
            {household && <ManageUnitsDialog householdId={household.householdId} />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryDialog(true)}
              className="gap-1.5"
            >
              <FolderPlus className="h-4 w-4" />
              {t('inventory:categories.manage', 'Kategorien verwalten')}
            </Button>
          </div>
        </Card>

        {/* Item List */}
        {isLoading ? (
          <p>{t('common:status.loading', 'Lade Inventar...')}</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('inventory:messages.noItems', 'Keine Artikel gefunden.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const unit = units.find((u: UnitOption) => u.id === item.unitId);
              const displayQty = quickEditQty[item.id] ?? item.quantity;
              const hasPhoto = normalizePhotoUrls(item.photoUrls).length > 0;
              return (
                <Card key={item.id}>
                  {/* Image area – only shown when showImages=true */}
                  {showImages && (
                    <CardHeader className="p-0 relative">
                      {hasPhoto ? (
                        <img
                          src={normalizePhotoUrls(item.photoUrls)[0].url}
                          alt={item.name}
                          className="w-full h-40 object-cover rounded-t-lg cursor-pointer"
                          onClick={() => setLocation(`/inventory/${item.id}`)}
                        />
                      ) : (
                        <div className="w-full h-40 bg-muted rounded-t-lg flex items-center justify-center cursor-pointer" onClick={() => setLocation(`/inventory/${item.id}`)}>
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button variant="ghost" size="icon" className="bg-background/80 hover:bg-background" onClick={() => setLocation(`/inventory/${item.id}?edit=true`)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="bg-background/80 hover:bg-background" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold truncate cursor-pointer flex-1" onClick={() => setLocation(`/inventory/${item.id}`)}>{item.name}</h3>
                      {/* Edit/delete buttons when images are hidden */}
                      {!showImages && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/inventory/${item.id}?edit=true`)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {item.categoryId && categories.find(c => c.id === item.categoryId) && (
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full border"
                        style={getCategoryStyle(categories.find(c => c.id === item.categoryId)?.color || '#ccc')}
                      >
                        {categories.find(c => c.id === item.categoryId)?.name}
                      </span>
                    )}
                    {item.ownershipType === 'household' ? (
                      <p className="text-xs text-muted-foreground">{t('inventory:fields.ownershipHousehold', 'Eigentum: Haushalt')}</p>
                    ) : (
                      <p className="text-xs font-semibold">{t('inventory:fields.owners', 'Eigentümer:')} <span className="font-normal">{item.owners.map((o: any) => o.memberName).join(', ')}</span></p>
                    )}
                    {/* Quantity row with inline +/- */}
                    {(displayQty != null || item.unitId != null) && (
                      <div className="flex items-center gap-1 pt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => quickAdjustQty(item, -1)}
                          disabled={updateItemMutation.isPending || (displayQty ?? 0) <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground min-w-[3rem] justify-center">
                          {formatQuantityWithUnit(displayQty, unit)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => quickAdjustQty(item, 1)}
                          disabled={updateItemMutation.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => setLocation(`/inventory/${item.id}`)}>
                        {t('inventory:actions.borrow', 'Ausleihen')}
                      </Button>
                      {pendingCountMap.has(item.id) && (
                        <Button size="sm" variant="outline" onClick={() => setLocation(`/inventory/${item.id}`)}>
                          {pendingCountMap.get(item.id) || 0} {t('inventory:actions.requests', 'Anfragen')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manage Categories Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory:categories.manage', 'Kategorien verwalten')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span>{cat.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddCategory} className="space-y-4 border-t pt-4">
            <DialogHeader>
              <DialogTitle>{t('inventory:categories.new', 'Neue Kategorie')}</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="categoryName">{t('inventory:fields.name')}</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('inventory:categories.namePlaceholder', 'z.B. Elektronik')}
              />
            </div>
            <div>
              <Label htmlFor="categoryColor">{t('common:labels.color')}</Label>
              <Input
                id="categoryColor"
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit">{t('common:actions.add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory:categories.edit', 'Kategorie bearbeiten')}</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <Label htmlFor="editCategoryName">{t('inventory:fields.name')}</Label>
                <Input
                  id="editCategoryName"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editCategoryColor">{t('common:labels.color')}</Label>
                <Input
                  id="editCategoryColor"
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit">{t('common:actions.save')}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory:newItem')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label htmlFor="itemName">{t('inventory:fields.name')} *</Label>
              <Input
                id="itemName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('inventory:fields.namePlaceholder', 'z.B. Laptop')}
                required
              />
            </div>

            <div>
              <Label htmlFor="itemDetails">{t('inventory:fields.details')}</Label>
              <Input
                id="itemDetails"
                value={newItemDetails}
                onChange={(e) => setNewItemDetails(e.target.value)}
                placeholder={t('inventory:fields.detailsPlaceholder', 'z.B. MacBook Pro 2023')}
              />
            </div>

            <div>
              <Label htmlFor="itemCategory">{t('inventory:fields.category')} *</Label>
              <Select
                value={newItemCategoryId?.toString() || ""}
                onValueChange={(value) => setNewItemCategoryId(Number(value))}
              >
                <SelectTrigger id="itemCategory">
                  <SelectValue placeholder={t('inventory:fields.selectCategory', 'Kategorie wählen')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('inventory:fields.photos', 'Fotos (max. 5)')}</Label>
              <div className="space-y-2">
                {newItemPhotos.map((photo, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <img src={photo.url} alt={photo.filename} className="w-16 h-16 object-cover rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {newItemPhotos.length < 5 && (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto && <p className="text-sm text-muted-foreground mt-1">{t('common:status.uploading', 'Lädt hoch...')}</p>}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>{t('inventory:fields.ownership', 'Eigentum')} *</Label>
              <Select
                value={newItemOwnershipType}
                onValueChange={(value: "personal" | "household") => {
                  setNewItemOwnershipType(value);
                  if (value === 'household') {
                    setNewItemOwnerIds([]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="household">{t('inventory:fields.ownershipHousehold', 'Haushaltseigentum')}</SelectItem>
                  <SelectItem value="personal">{t('inventory:fields.ownershipPersonal', 'Persönliches Eigentum')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newItemOwnershipType === 'personal' && (
              <div>
                <Label>{t('inventory:fields.selectOwners', 'Eigentümer auswählen')} *</Label>
                <div className="space-y-2 mt-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`owner-${m.id}`}
                        checked={newItemOwnerIds.includes(m.id)}
                        onChange={() => handleToggleOwner(m.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`owner-${m.id}`} className="cursor-pointer">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit">{t('common:actions.add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </AppLayout>
  );
}

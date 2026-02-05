import { useState } from "react";
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
import { Plus, Trash2, Filter, Edit2, FolderPlus, Package } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { compressImage } from "@/lib/imageCompression";

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

  const utils = trpc.useUtils();
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

  const addCategoryMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
      toast.success("Kategorie hinzugefügt");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateCategoryMutation = trpc.shopping.renameCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setEditingCategory(null);
      toast.success("Kategorie aktualisiert");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteCategoryMutation = trpc.shopping.deleteCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      toast.success("Kategorie gelöscht");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const uploadMutation = trpc.upload.uploadPhoto.useMutation({
    onSuccess: (data: { url: string, filename: string }) => {
      setNewItemPhotos([...newItemPhotos, { url: data.url, filename: data.filename }]);
      setUploadingPhoto(false);
      toast.success("Foto hochgeladen");
    },
    onError: (error: any) => {
      setUploadingPhoto(false);
      toast.error(error.message);
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
      toast.success("Artikel hinzugefügt");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
      toast.success("Artikel gelöscht");
    },
    onError: (error: any) => {
      toast.error(error.message);
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
    if (confirm("Kategorie wirklich löschen?")) {
      deleteCategoryMutation.mutate({ 
        categoryId, 
        householdId: household.householdId, 
        memberId: member.memberId 
      });
    }
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Artikel wirklich löschen?")) {
      deleteItemMutation.mutate({ itemId });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (newItemPhotos.length >= 5) {
      toast.error("Maximal 5 Fotos erlaubt");
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
      toast.error('Fehler beim Komprimieren des Bildes');
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
      toast.error("Name und Kategorie sind erforderlich");
      return;
    }

    if (newItemOwnershipType === 'personal' && newItemOwnerIds.length === 0) {
      toast.error("Bitte wähle mindestens einen Eigentümer");
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
    });
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory && item.categoryId !== filterCategory) return false;
    if (filterOwner) {
      if (item.ownershipType === 'household') return false;
      if (!item.owners.some((o: any) => o.memberId === filterOwner)) return false;
    }
    return true;
  });

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Inventar</h1>
            <p className="text-muted-foreground">Verwalte dein Haushaltsinventar</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Artikel hinzufügen
          </Button>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Filter className="h-5 w-5 mr-2" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kategorie</Label>
                <Select
                  value={filterCategory?.toString() || "all"}
                  onValueChange={(value) => setFilterCategory(value === "all" ? null : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Eigentümer</Label>
                <Select
                  value={filterOwner?.toString() || "all"}
                  onValueChange={(value) => setFilterOwner(value === "all" ? null : Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Eigentümer</SelectItem>
                    <SelectItem value="household">Haushaltseigentum</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.memberName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Lädt...</div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Artikel gefunden</p>
                <p className="text-sm mt-2">Füge deinen ersten Artikel hinzu</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => setLocation(`/inventory/${item.id}`)}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs border"
                          style={getCategoryStyle(item.categoryColor || '#3b82f6')}
                        >
                          {item.categoryName}
                        </span>
                      </div>
                      {item.details && (
                        <p className="text-sm text-muted-foreground mb-2">{item.details}</p>
                      )}
                      {item.photoUrls && item.photoUrls.length > 0 && (() => {
                        const photos = normalizePhotoUrls(item.photoUrls);
                        return (
                          <div className="flex gap-1 mt-2 mb-2">
                            {photos.slice(0, 3).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo.url}
                                alt={photo.filename}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ))}
                            {photos.length > 3 && (
                              <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                +{photos.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {item.ownershipType === 'household' 
                            ? 'Haushaltseigentum' 
                            : `Eigentum: ${item.owners.map((o: any) => o.memberName).join(', ')}`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/inventory/${item.id}`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Category Management */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Kategorien verwalten</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Neue Kategorie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ backgroundColor: cat.color, borderColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCategory(cat)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Kategorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Name</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="z.B. Elektronik"
              />
            </div>
            <div>
              <Label htmlFor="categoryColor">Farbe</Label>
              <Input
                id="categoryColor"
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                Abbrechen
              </Button>
              <Button type="submit">Hinzufügen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie bearbeiten</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <Label htmlFor="editCategoryName">Name</Label>
                <Input
                  id="editCategoryName"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editCategoryColor">Farbe</Label>
                <Input
                  id="editCategoryColor"
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Artikel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label htmlFor="itemName">Name *</Label>
              <Input
                id="itemName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="z.B. Laptop"
                required
              />
            </div>

            <div>
              <Label htmlFor="itemDetails">Details</Label>
              <Input
                id="itemDetails"
                value={newItemDetails}
                onChange={(e) => setNewItemDetails(e.target.value)}
                placeholder="z.B. MacBook Pro 2023"
              />
            </div>

            <div>
              <Label htmlFor="itemCategory">Kategorie *</Label>
              <Select
                value={newItemCategoryId?.toString() || ""}
                onValueChange={(value) => setNewItemCategoryId(Number(value))}
              >
                <SelectTrigger id="itemCategory">
                  <SelectValue placeholder="Kategorie wählen" />
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
              <Label>Fotos (max. 5)</Label>
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
                    {uploadingPhoto && <p className="text-sm text-muted-foreground mt-1">Lädt hoch...</p>}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Eigentum *</Label>
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
                  <SelectItem value="household">Haushaltseigentum</SelectItem>
                  <SelectItem value="personal">Persönliches Eigentum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newItemOwnershipType === 'personal' && (
              <div>
                <Label>Eigentümer auswählen *</Label>
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
                Abbrechen
              </Button>
              <Button type="submit">Hinzufügen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </AppLayout>
  );
}

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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Filter, ShoppingCart, Edit2, FolderPlus } from "lucide-react";
import { CompleteShoppingDialog } from "@/components/CompleteShoppingDialog";
import { BottomNav } from "@/components/BottomNav";

export default function Shopping() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState<number | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  // Item edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemCategoryId, setEditItemCategoryId] = useState<number | null>(null);
  const [editItemQuantity, setEditItemQuantity] = useState("");
  
  // Category management state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<"create" | "rename">("create");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#6B7280");
  
  // Task creation from items state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.shopping.list.useQuery(
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

  const addMutation = trpc.shopping.add.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
      setNewItemName("");
      toast.success("Artikel hinzugefügt");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = trpc.shopping.toggleComplete.useMutation({
    onMutate: async ({ itemId, isCompleted }) => {
      await utils.shopping.list.cancel();
      const previousItems = utils.shopping.list.getData({ householdId: household?.householdId ?? 0 });
      
      utils.shopping.list.setData(
        { householdId: household?.householdId ?? 0 },
        (old) => old?.map((item) =>
          item.id === itemId ? { ...item, isCompleted } : item
        )
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      utils.shopping.list.setData(
        { householdId: household?.householdId ?? 0 },
        context?.previousItems
      );
      toast.error("Fehler beim Aktualisieren");
    },
    onSettled: () => {
      utils.shopping.list.invalidate();
    },
  });

  const updateMutation = trpc.shopping.update.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
      setShowEditDialog(false);
      toast.success("Artikel aktualisiert");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.shopping.delete.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
      toast.success("Artikel gelöscht");
    },
  });

  const completeMutation = trpc.shopping.completeShopping.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
      toast.success("Einkauf abgeschlossen!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const createCategoryMutation = trpc.shopping.createCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setShowCategoryDialog(false);
      setCategoryName("");
      toast.success("Kategorie erstellt");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const renameCategoryMutation = trpc.shopping.renameCategory.useMutation({
    onSuccess: () => {
      utils.shopping.listCategories.invalidate();
      setShowCategoryDialog(false);
      setCategoryName("");
      setEditingCategoryId(null);
      toast.success("Kategorie umbenannt");
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

  const createTaskMutation = trpc.tasks.add.useMutation({
    onSuccess: async (data) => {
      // Link selected items to the newly created task
      if (selectedItemIds.size > 0) {
        await linkItemsMutation.mutateAsync({
          itemIds: Array.from(selectedItemIds),
          taskId: data.id,
          householdId: household?.householdId ?? 0,
          memberId: member?.memberId ?? 0,
        });
      }
      
      utils.shopping.list.invalidate();
      setShowTaskDialog(false);
      setSelectedItemIds(new Set());
      setTaskName("");
      setTaskDueDate("");
      setTaskDueTime("");
      setTaskAssignedTo(null);
      toast.success("Aufgabe erstellt und Artikel verknüpft");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const linkItemsMutation = trpc.shopping.linkItemsToTask.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Fehler beim Verknüpfen der Artikel");
    },
  });

  // Auth check removed - AppLayout handles this

  if (!household || !member) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </AppLayout>
    );
  }

  // Set default category when categories load
  if (categories.length > 0 && newItemCategoryId === null) {
    setNewItemCategoryId(categories[0].id);
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategoryId) return;

    addMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: newItemName.trim(),
      categoryId: newItemCategoryId,
    });
  };

  const handleOpenEditDialog = (item: any) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemCategoryId(item.categoryId);
    setEditItemQuantity(item.quantity || "");
    setShowEditDialog(true);
  };

  const handleEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemName.trim() || !editItemCategoryId || !editingItemId) return;

    updateMutation.mutate({
      itemId: editingItemId,
      householdId: household.householdId,
      memberId: member.memberId,
      name: editItemName.trim(),
      categoryId: editItemCategoryId,
      quantity: editItemQuantity.trim() || undefined,
    });
  };

  const handleToggleComplete = (itemId: number, currentStatus: boolean) => {
    toggleMutation.mutate({
      itemId,
      householdId: household.householdId,
      memberId: member.memberId,
      isCompleted: !currentStatus,
    });
  };

  const handleDelete = (itemId: number) => {
    if (confirm("Möchten Sie diesen Artikel wirklich löschen?")) {
      deleteMutation.mutate({
        itemId,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const filteredItems = (filterCategoryId === "all"
    ? items
    : items.filter((item) => item.categoryId === Number(filterCategoryId)))
    .sort((a, b) => {
      // Items without taskId (no shopping cart) come first
      if (!a.taskId && b.taskId) return -1;
      if (a.taskId && !b.taskId) return 1;
      return 0;
    });

  const completedItems = items.filter((item) => item.isCompleted);

  const handleCompleteShopping = async (data: { comment?: string; photoUrls: string[] }) => {
    if (completedItems.length === 0) {
      toast.error("Keine abgehakten Artikel zum Abschließen");
      return;
    }

    await completeMutation.mutateAsync({
      householdId: household.householdId,
      memberId: member.memberId,
      itemIds: completedItems.map((item) => item.id),
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || !category.color) return "bg-muted text-muted-foreground border-border";

    // Convert hex color to inline style
    return "";
  };

  const getCategoryStyle = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || !category.color) return {};

    return {
      backgroundColor: `${category.color}20`,
      color: category.color,
      borderColor: `${category.color}40`,
    };
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unbekannt";
  };

  const handleOpenCreateCategory = () => {
    setCategoryDialogMode("create");
    setCategoryName("");
    setCategoryColor("#6B7280");
    setEditingCategoryId(null);
    setShowCategoryDialog(true);
  };

  const handleOpenRenameCategory = (categoryId: number, currentName: string, currentColor: string) => {
    setCategoryDialogMode("rename");
    setCategoryName(currentName);
    setCategoryColor(currentColor || "#6B7280");
    setEditingCategoryId(categoryId);
    setShowCategoryDialog(true);
  };

  const handleCategoryDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (categoryDialogMode === "create") {
      createCategoryMutation.mutate({
        householdId: household.householdId,
        memberId: member.memberId,
        name: categoryName.trim(),
        color: categoryColor,
      });
    } else {
      if (!editingCategoryId) return;
      renameCategoryMutation.mutate({
        categoryId: editingCategoryId,
        householdId: household.householdId,
        memberId: member.memberId,
        name: categoryName.trim(),
        color: categoryColor,
      });
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    const itemsInCategory = items.filter((item) => item.categoryId === categoryId);
    if (itemsInCategory.length > 0) {
      toast.error(`Kategorie kann nicht gelöscht werden: ${itemsInCategory.length} Artikel verwenden sie noch`);
      return;
    }

    if (confirm("Möchten Sie diese Kategorie wirklich löschen?")) {
      deleteCategoryMutation.mutate({
        categoryId,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const handleToggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleOpenTaskDialog = () => {
    if (selectedItemIds.size === 0) {
      toast.error("Bitte wählen Sie mindestens einen Artikel aus");
      return;
    }
    
    // Pre-fill task name with selected item count
    const selectedCount = selectedItemIds.size;
    setTaskName(`${selectedCount} Artikel einkaufen`);
    setShowTaskDialog(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    createTaskMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: taskName.trim(),
      dueDate: taskDueDate || undefined,
      dueTime: taskDueTime || undefined,
      assignedTo: taskAssignedTo || member.memberId,
    });
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Einkaufsliste</h1>
            <p className="text-muted-foreground">{household?.householdName || 'Laden...'}</p>
          </div>
        </div>

        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Neuen Artikel hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Artikel</Label>
                <Input
                  id="itemName"
                  placeholder="z.B. Milch, Brot, Äpfel..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCategory">Kategorie</Label>
                <Select 
                  value={newItemCategoryId?.toString() || ""} 
                  onValueChange={(value) => setNewItemCategoryId(Number(value))}
                >
                  <SelectTrigger id="itemCategory">
                    <SelectValue />
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
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {addMutation.isPending ? "Wird hinzugefügt..." : "Artikel hinzufügen"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
              <SelectTrigger className="w-[200px]">
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
          {selectedItemIds.size > 0 && (
            <Button
              onClick={handleOpenTaskDialog}
              variant="outline"
              className="shrink-0"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Einkauf als Aufgabe organisieren ({selectedItemIds.size})
            </Button>
          )}
        </div>

        {completedItems.length > 0 && (
          <div className="mb-6">
            <Button
              onClick={() => setShowCompleteDialog(true)}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Einkauf abschließen ({completedItems.length} Artikel)
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Lädt Einkaufsliste...
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              {filterCategoryId === "all"
                ? "Keine Artikel in der Einkaufsliste. Fügen Sie oben einen neuen Artikel hinzu!"
                : `Keine Artikel in dieser Kategorie.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`shadow-sm transition-all duration-200 ${
                  item.isCompleted ? "opacity-60" : "hover:shadow-md"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItemIds.has(item.id)}
                      onCheckedChange={() => handleToggleItemSelection(item.id)}
                      className="mt-1 touch-target"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium flex items-center gap-2 ${item.isCompleted ? "line-through" : ""}`}>
                        {item.name}
                        {item.taskId && (
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="mt-1">
                        <span 
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={getCategoryStyle(item.categoryId)}
                        >
                          {getCategoryName(item.categoryId)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={item.isCompleted ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleComplete(item.id, item.isCompleted)}
                      className="shrink-0 touch-target"
                    >
                      {item.isCompleted ? "Rückgängig" : "Erledigt"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditDialog(item)}
                      className="shrink-0 hover:bg-primary/10 touch-target"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Category Management Section */}
        <Card className="mt-8 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Kategorien verwalten</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCreateCategory}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Neue Kategorie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Keine Kategorien vorhanden. Erstellen Sie eine neue Kategorie.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => {
                  const itemCount = items.filter((item) => item.categoryId === category.id).length;
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="inline-block px-3 py-1 rounded-full text-sm font-medium border"
                          style={getCategoryStyle(category.id)}
                        >
                          {category.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {itemCount} {itemCount === 1 ? "Artikel" : "Artikel"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRenameCategory(category.id, category.name, category.color || "#6B7280")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={itemCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCompleteDialog && completedItems.length > 0 && (
        <CompleteShoppingDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          items={completedItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: getCategoryName(item.categoryId),
          }))}
          onComplete={handleCompleteShopping}
        />
      )}

      {/* Category Dialog */}
      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditItem}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editItemName">Artikelname</Label>
                <Input
                  id="editItemName"
                  placeholder="z.B. Milch, Brot..."
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemCategory">Kategorie</Label>
                <Select
                  value={editItemCategoryId?.toString() || ""}
                  onValueChange={(value) => setEditItemCategoryId(Number(value))}
                >
                  <SelectTrigger id="editItemCategory">
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemQuantity">Menge (optional)</Label>
                <Input
                  id="editItemQuantity"
                  placeholder="z.B. 2x, 500g..."
                  value={editItemQuantity}
                  onChange={(e) => setEditItemQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryDialogMode === "create" ? "Neue Kategorie erstellen" : "Kategorie umbenennen"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategoryDialogSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Kategoriename</Label>
                <Input
                  id="categoryName"
                  placeholder="z.B. Getränke, Tierfutter..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryColor">Farbe</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="categoryColor"
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{categoryColor.toUpperCase()}</span>
                  <div
                    className="px-3 py-1 rounded-full text-sm font-medium border"
                    style={{
                      backgroundColor: `${categoryColor}20`,
                      color: categoryColor,
                      borderColor: `${categoryColor}40`,
                    }}
                  >
                    Vorschau
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={createCategoryMutation.isPending || renameCategoryMutation.isPending}
              >
                {categoryDialogMode === "create" ? "Erstellen" : "Umbenennen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgabe aus Artikeln erstellen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label htmlFor="taskName">Aufgabenname</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="z.B. Einkauf erledigen"
                required
              />
            </div>
            <div>
              <Label htmlFor="taskDueDate">Fälligkeitsdatum (optional)</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="taskDueTime">Uhrzeit (optional)</Label>
              <Input
                id="taskDueTime"
                type="time"
                value={taskDueTime}
                onChange={(e) => setTaskDueTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="taskAssignedTo">Zuständig</Label>
              <Select
                value={taskAssignedTo?.toString() || member.memberId.toString()}
                onValueChange={(value) => setTaskAssignedTo(Number(value))}
              >
                <SelectTrigger id="taskAssignedTo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.memberName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Ausgewählte Artikel ({selectedItemIds.size}):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(selectedItemIds).map((itemId) => {
                  const item = items.find((i) => i.id === itemId);
                  return item ? (
                    <div key={itemId} className="text-sm flex items-center gap-2">
                      <ShoppingCart className="h-3 w-3 text-primary" />
                      {item.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTaskDialog(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                Aufgabe erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </AppLayout>
  );
}

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

export default function Shopping() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState<number | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  // Category management state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<"create" | "rename">("create");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.shopping.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: categories = [] } = trpc.shopping.listCategories.useQuery(
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

  const filteredItems = filterCategoryId === "all"
    ? items
    : items.filter((item) => item.categoryId === Number(filterCategoryId));

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
    if (!category) return "bg-muted text-muted-foreground border-border";

    // Use consistent colors based on category name
    const colors: Record<string, string> = {
      Lebensmittel: "bg-primary/10 text-primary border-primary/20",
      Haushalt: "bg-secondary/10 text-secondary border-secondary/20",
      Pflege: "bg-accent/10 text-accent border-accent/20",
    };
    return colors[category.name] || "bg-muted text-muted-foreground border-border";
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unbekannt";
  };

  const handleOpenCreateCategory = () => {
    setCategoryDialogMode("create");
    setCategoryName("");
    setEditingCategoryId(null);
    setShowCategoryDialog(true);
  };

  const handleOpenRenameCategory = (categoryId: number, currentName: string) => {
    setCategoryDialogMode("rename");
    setCategoryName(currentName);
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
      });
    } else {
      if (!editingCategoryId) return;
      renameCategoryMutation.mutate({
        categoryId: editingCategoryId,
        householdId: household.householdId,
        memberId: member.memberId,
        name: categoryName.trim(),
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

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl">
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

        <div className="mb-4 flex items-center gap-2">
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
                      checked={item.isCompleted}
                      onCheckedChange={() => handleToggleComplete(item.id, item.isCompleted)}
                      className="mt-1 touch-target"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${item.isCompleted ? "line-through" : ""}`}>
                        {item.name}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(item.categoryId)}`}>
                          {getCategoryName(item.categoryId)}
                        </span>
                      </div>
                    </div>
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
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(category.id)}`}>
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
                          onClick={() => handleOpenRenameCategory(category.id, category.name)}
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
    </AppLayout>
  );
}

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
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Filter, ShoppingCart } from "lucide-react";
import { CompleteShoppingDialog } from "@/components/CompleteShoppingDialog";

const CATEGORIES = ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"] as const;

export default function Shopping() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<typeof CATEGORIES[number]>("Lebensmittel");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.shopping.list.useQuery(
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: newItemName.trim(),
      category: newItemCategory,
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

  const filteredItems = filterCategory === "all"
    ? items
    : items.filter((item) => item.category === filterCategory);

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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Lebensmittel: "bg-primary/10 text-primary border-primary/20",
      Haushalt: "bg-secondary/10 text-secondary border-secondary/20",
      Pflege: "bg-accent/10 text-accent border-accent/20",
      Sonstiges: "bg-muted text-muted-foreground border-border",
    };
    return colors[category] || colors.Sonstiges;
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
                <Select value={newItemCategory} onValueChange={(value: any) => setNewItemCategory(value)}>
                  <SelectTrigger id="itemCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
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
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
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
              {filterCategory === "all"
                ? "Keine Artikel in der Einkaufsliste. Fügen Sie oben einen neuen Artikel hinzu!"
                : `Keine Artikel in der Kategorie "${filterCategory}".`}
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
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                          {item.category}
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
      </div>

      <CompleteShoppingDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        items={completedItems.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
        }))}
        onComplete={handleCompleteShopping}
      />
    </AppLayout>
  );
}

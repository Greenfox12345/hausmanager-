import { useState } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Filter, ShoppingCart, Edit2, FolderPlus } from "lucide-react";
import { CompleteShoppingItemDialog } from "@/components/CompleteShoppingItemDialog";
import { QuickCategoryCreate } from "@/components/QuickCategoryCreate";
import { BottomNav } from "@/components/BottomNav";

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

export default function Shopping() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [newItemName, setNewItemName] = useState("");
  const [newItemDetails, setNewItemDetails] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState<number | null>(null);
  const [newItemPhotoUrls, setNewItemPhotoUrls] = useState<{url: string, filename: string}[]>([]);
  const [isUploadingNewItemPhoto, setIsUploadingNewItemPhoto] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  // Item edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemCategoryId, setEditItemCategoryId] = useState<number | null>(null);
  const [editItemQuantity, setEditItemQuantity] = useState("");
  const [editItemPhotoUrls, setEditItemPhotoUrls] = useState<{url: string, filename: string}[]>([]);
  const [isUploadingEditItemPhoto, setIsUploadingEditItemPhoto] = useState(false);
  
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
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [taskEnableRepeat, setTaskEnableRepeat] = useState(false);
  const [taskRepeatInterval, setTaskRepeatInterval] = useState("1");
  const [taskRepeatUnit, setTaskRepeatUnit] = useState<"days" | "weeks" | "months">("days");
  const [taskEnableRotation, setTaskEnableRotation] = useState(false);
  const [taskRequiredPersons, setTaskRequiredPersons] = useState("1");
  const [taskExcludedMembers, setTaskExcludedMembers] = useState<number[]>([]);
  const [taskEnableDependencies, setTaskEnableDependencies] = useState(false);
  const [taskPrerequisites, setTaskPrerequisites] = useState<number[]>([]);
  const [taskFollowups, setTaskFollowups] = useState<number[]>([]);
  const [taskEnableProject, setTaskEnableProject] = useState(false);
  const [taskSelectedProjects, setTaskSelectedProjects] = useState<number[]>([]);
  const [taskCreateNewProject, setTaskCreateNewProject] = useState(false);
  const [taskNewProjectName, setTaskNewProjectName] = useState("");
  const [taskNewProjectDescription, setTaskNewProjectDescription] = useState("");
  
  // Detail view state
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

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

  const { data: allTasks = [] } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );
  
  const { data: projects = [] } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );
  
  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();
  const createProjectMutation = trpc.projects.create.useMutation();

  const uploadPhotoMutation = trpc.upload.uploadPhoto.useMutation();

  const addMutation = trpc.shopping.add.useMutation({
    onSuccess: () => {
      utils.shopping.list.invalidate();
      setNewItemName("");
      setNewItemDetails("");
      setNewItemPhotoUrls([]);
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
      
      // Add dependencies if enabled
      if ((taskEnableProject && taskSelectedProjects.length > 0) || (taskEnableDependencies && (taskPrerequisites.length > 0 || taskFollowups.length > 0))) {
        await addDependenciesMutation.mutateAsync({
          taskId: data.id,
          householdId: household?.householdId ?? 0,
          prerequisites: taskEnableDependencies && taskPrerequisites.length > 0 ? taskPrerequisites : undefined,
          followups: taskEnableDependencies && taskFollowups.length > 0 ? taskFollowups : undefined,
        });
      }
      
      // Link task to projects via update if needed
      if (taskEnableProject && taskSelectedProjects.length > 0) {
        await updateTaskMutation.mutateAsync({
          taskId: data.id,
          householdId: household?.householdId ?? 0,
          memberId: member?.memberId ?? 0,
          projectIds: taskSelectedProjects,
        });
      }
      
      // Invalidate and refetch to ensure UI updates
      await utils.shopping.list.invalidate();
      await utils.tasks.list.invalidate();
      await utils.projects.list.invalidate();
      
      setShowTaskDialog(false);
      setSelectedItemIds(new Set());
      setTaskName("");
      setTaskDueDate("");
      setTaskDueTime("");
      setSelectedAssignees([]);
      setTaskEnableRepeat(false);
      setTaskRepeatInterval("1");
      setTaskRepeatUnit("days");
      setTaskEnableRotation(false);
      setTaskRequiredPersons("1");
      setTaskExcludedMembers([]);
      setTaskEnableProject(false);
      setTaskSelectedProjects([]);
      setTaskCreateNewProject(false);
      setTaskNewProjectName("");
      setTaskNewProjectDescription("");
      setTaskEnableDependencies(false);
      setTaskPrerequisites([]);
      setTaskFollowups([]);
      toast.success("Aufgabe erstellt und verknüpft");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Fehler beim Verknüpfen der Aufgaben");
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
      details: newItemDetails.trim() || undefined,
      photoUrls: newItemPhotoUrls.length > 0 ? newItemPhotoUrls : undefined,
    });
  };

  const handleNewItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (newItemPhotoUrls.length + files.length > 5) {
      toast.error("Maximal 5 Fotos erlaubt");
      return;
    }

    setIsUploadingNewItemPhoto(true);
    const uploadedFiles: {url: string, filename: string}[] = [];

    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const result = await uploadPhotoMutation.mutateAsync({
          photo: base64,
          filename: file.name,
        });

        uploadedFiles.push({ url: result.url, filename: result.filename });
      } catch (error) {
        toast.error("Foto-Upload fehlgeschlagen");
      }
    }

    setNewItemPhotoUrls([...newItemPhotoUrls, ...uploadedFiles]);
    setIsUploadingNewItemPhoto(false);
    e.target.value = "";
  };

  const handleRemoveNewItemPhoto = (index: number) => {
    setNewItemPhotoUrls(newItemPhotoUrls.filter((_, i) => i !== index));
  };

  const handleOpenEditDialog = (item: any) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemCategoryId(item.categoryId);
    setEditItemQuantity(item.details || "");
    setEditItemPhotoUrls(normalizePhotoUrls(item.photoUrls));
    setShowEditDialog(true);
  };

  const handleEditItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (editItemPhotoUrls.length + files.length > 5) {
      toast.error("Maximal 5 Fotos erlaubt");
      return;
    }

    setIsUploadingEditItemPhoto(true);
    const uploadedFiles: {url: string, filename: string}[] = [];

    for (const file of Array.from(files)) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const result = await uploadPhotoMutation.mutateAsync({
          photo: base64,
          filename: file.name,
        });

        uploadedFiles.push({ url: result.url, filename: result.filename });
      } catch (error) {
        toast.error("Foto-Upload fehlgeschlagen");
      }
    }

    setEditItemPhotoUrls([...editItemPhotoUrls, ...uploadedFiles]);
    setIsUploadingEditItemPhoto(false);
    e.target.value = "";
  };

  const handleRemoveEditItemPhoto = (index: number) => {
    setEditItemPhotoUrls(editItemPhotoUrls.filter((_, i) => i !== index));
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
      details: editItemQuantity.trim() || undefined,
      photoUrls: editItemPhotoUrls.length > 0 ? editItemPhotoUrls : undefined,
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
      const aSelected = selectedItemIds.has(a.id);
      const bSelected = selectedItemIds.has(b.id);
      const aLinked = !!a.taskId;
      const bLinked = !!b.taskId;
      
      // Priority: unselected (not linked) → selected (not linked) → linked (selected first, then unselected)
      
      // Both not linked
      if (!aLinked && !bLinked) {
        if (!aSelected && bSelected) return -1; // unselected before selected
        if (aSelected && !bSelected) return 1;
        return 0;
      }
      
      // One linked, one not → not linked comes first
      if (!aLinked && bLinked) return -1;
      if (aLinked && !bLinked) return 1;
      
      // Both linked → selected linked before unselected linked
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  const selectedItems = items.filter((item) => selectedItemIds.has(item.id));

  const handleCompleteShopping = async (data: { 
    itemIds: number[];
    itemsToInventory?: {
      itemId: number;
      name: string;
      categoryId: number;
      details?: string;
      photoUrls?: {url: string, filename: string}[];
      ownershipType: "personal" | "household";
      ownerIds?: number[];
    }[];
  }) => {
    if (selectedItemIds.size === 0) {
      toast.error("Keine ausgewählten Artikel zum Abschließen");
      return;
    }

    await completeMutation.mutateAsync({
      householdId: household.householdId,
      memberId: member.memberId,
      itemIds: data.itemIds,
      itemsToInventory: data.itemsToInventory,
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    
    if (selectedAssignees.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Verantwortlichen");
      return;
    }
    
    try {
      let finalProjectIds = [...taskSelectedProjects];
      
      // Create new project if requested
      if (taskEnableProject && taskCreateNewProject) {
        const projectName = taskNewProjectName.trim() || taskName.trim();
        const projectResult = await createProjectMutation.mutateAsync({
          householdId: household.householdId,
          memberId: member.memberId,
          name: projectName,
          description: taskNewProjectDescription.trim() || undefined,
          endDate: taskDueDate || undefined,
          isNeighborhoodProject: false,
        });
        finalProjectIds = [projectResult.projectId];
      }
      
      // Create task with final project IDs
      createTaskMutation.mutate({
        householdId: household.householdId,
        memberId: member.memberId,
        name: taskName.trim(),
        dueDate: taskDueDate || undefined,
        dueTime: taskDueTime || undefined,
        assignedTo: selectedAssignees[0],
        frequency: taskEnableRepeat ? "custom" : "once",
        repeatInterval: taskEnableRepeat ? Number(taskRepeatInterval) : undefined,
        repeatUnit: taskEnableRepeat ? taskRepeatUnit : undefined,
        enableRotation: taskEnableRotation,
        requiredPersons: taskEnableRotation ? Number(taskRequiredPersons) : undefined,
        excludedMembers: taskEnableRotation ? taskExcludedMembers : undefined,
        projectIds: taskEnableProject && finalProjectIds.length > 0 ? finalProjectIds : undefined,
      });
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen der Aufgabe");
    }
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
                <Label htmlFor="itemDetails">Details (optional)</Label>
                <Input
                  id="itemDetails"
                  placeholder="z.B. 2x, 500g, Bio..."
                  value={newItemDetails}
                  onChange={(e) => setNewItemDetails(e.target.value)}
                  disabled={!newItemName.trim()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCategory">Kategorie</Label>
                <div className="flex items-center gap-2">
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
                  <QuickCategoryCreate
                    householdId={household.householdId}
                    memberId={member.memberId}
                    onCategoryCreated={(categoryId) => setNewItemCategoryId(categoryId)}
                    type="shopping"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newItemPhotos">Fotos (optional, max. 5)</Label>
                <Input
                  id="newItemPhotos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewItemPhotoUpload}
                  disabled={isUploadingNewItemPhoto || newItemPhotoUrls.length >= 5}
                />
                {isUploadingNewItemPhoto && (
                  <p className="text-sm text-muted-foreground">Fotos werden hochgeladen...</p>
                )}
                {newItemPhotoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newItemPhotoUrls.map((photo, index) => (
                      <div key={index} className="relative">
                        <img src={photo.url} alt={photo.filename} className="w-20 h-20 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewItemPhoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

        {selectedItemIds.size > 0 && (
          <div className="mb-6">
            <Button
              onClick={() => setShowCompleteDialog(true)}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Einkauf abschließen ({selectedItemIds.size} Artikel)
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
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setDetailItem(item); setShowDetailDialog(true); }}>
                      <div className={`font-medium flex items-center gap-2 ${
                        selectedItemIds.has(item.id) ? "line-through text-muted-foreground" : ""
                      }`}>
                        {item.name}
                        {item.taskId && (
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {item.details && (
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {item.details}
                        </div>
                      )}
                      {item.photoUrls && item.photoUrls.length > 0 && (() => {
                        const photos = normalizePhotoUrls(item.photoUrls);
                        return (
                          <div className="flex gap-1 mt-2">
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

      {showCompleteDialog && selectedItems.length > 0 && (
        <CompleteShoppingItemDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          items={selectedItems}
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
                <Label htmlFor="editItemQuantity">Details (optional)</Label>
                <Input
                  id="editItemQuantity"
                  placeholder="z.B. 2x, 500g..."
                  value={editItemQuantity}
                  onChange={(e) => setEditItemQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemPhotos">Fotos (optional, max. 5)</Label>
                <Input
                  id="editItemPhotos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditItemPhotoUpload}
                  disabled={isUploadingEditItemPhoto || editItemPhotoUrls.length >= 5}
                />
                {isUploadingEditItemPhoto && (
                  <p className="text-sm text-muted-foreground">Fotos werden hochgeladen...</p>
                )}
                {editItemPhotoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editItemPhotoUrls.map((photo, index) => (
                      <div key={index} className="relative">
                        <img src={photo.url} alt={photo.filename} className="w-20 h-20 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItemPhoto(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              <Label>Verantwortliche *</Label>
              <div className="space-y-2 mt-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${m.id}`}
                      checked={selectedAssignees.includes(m.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAssignees([...selectedAssignees, m.id]);
                        } else {
                          setSelectedAssignees(selectedAssignees.filter((id) => id !== m.id));
                        }
                      }}
                    />
                    <Label htmlFor={`assignee-${m.id}`} className="cursor-pointer text-sm">
                      {m.memberName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Wiederholung aktivieren */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="taskEnableRepeat"
                checked={taskEnableRepeat}
                onCheckedChange={(checked) => setTaskEnableRepeat(checked as boolean)}
              />
              <Label htmlFor="taskEnableRepeat" className="cursor-pointer">
                Wiederholung aktivieren
              </Label>
            </div>
            
            {taskEnableRepeat && (
              <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={taskRepeatInterval}
                    onChange={(e) => setTaskRepeatInterval(e.target.value)}
                    className="w-20"
                  />
                  <Select value={taskRepeatUnit} onValueChange={(v) => setTaskRepeatUnit(v as "days" | "weeks" | "months")}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Tage</SelectItem>
                      <SelectItem value="weeks">Wochen</SelectItem>
                      <SelectItem value="months">Monate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taskEnableRotation"
                    checked={taskEnableRotation}
                    onCheckedChange={(checked) => setTaskEnableRotation(checked as boolean)}
                  />
                  <Label htmlFor="taskEnableRotation" className="cursor-pointer">
                    Verantwortung rotieren
                  </Label>
                </div>
                
                {taskEnableRotation && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <Label>Benötigte Personen</Label>
                      <Input
                        type="number"
                        min="1"
                        value={taskRequiredPersons}
                        onChange={(e) => setTaskRequiredPersons(e.target.value)}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <Label>Ausgeschlossene Mitglieder</Label>
                      <div className="space-y-1 mt-1">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`exclude-${m.id}`}
                              checked={taskExcludedMembers.includes(m.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTaskExcludedMembers([...taskExcludedMembers, m.id]);
                                } else {
                                  setTaskExcludedMembers(taskExcludedMembers.filter((id) => id !== m.id));
                                }
                              }}
                            />
                            <Label htmlFor={`exclude-${m.id}`} className="cursor-pointer text-sm">
                              {m.memberName}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Project Linkage */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="taskEnableProject"
                checked={taskEnableProject}
                onCheckedChange={(checked) => setTaskEnableProject(checked as boolean)}
              />
              <Label htmlFor="taskEnableProject" className="cursor-pointer">
                Mit Projekt verknüpfen
              </Label>
            </div>
            
            {taskEnableProject && (
              <div className="space-y-3 pl-6">
                <div>
                  <Label>Projekte auswählen</Label>
                  <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                    {projects.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={taskSelectedProjects.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTaskSelectedProjects([...taskSelectedProjects, project.id]);
                            } else {
                              setTaskSelectedProjects(taskSelectedProjects.filter((id) => id !== project.id));
                            }
                          }}
                        />
                        <Label htmlFor={`project-${project.id}`} className="cursor-pointer text-sm">
                          {project.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taskCreateNewProject"
                    checked={taskCreateNewProject}
                    onCheckedChange={(checked) => setTaskCreateNewProject(checked as boolean)}
                  />
                  <Label htmlFor="taskCreateNewProject" className="cursor-pointer text-sm">
                    Neues Projekt erstellen
                  </Label>
                </div>
                
                {taskCreateNewProject && (
                  <div className="space-y-2 pl-6">
                    <div>
                      <Label htmlFor="taskNewProjectName">Projektname</Label>
                      <Input
                        id="taskNewProjectName"
                        value={taskNewProjectName}
                        onChange={(e) => setTaskNewProjectName(e.target.value)}
                        placeholder="Name des neuen Projekts"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taskNewProjectDescription">Beschreibung (optional)</Label>
                      <Textarea
                        id="taskNewProjectDescription"
                        value={taskNewProjectDescription}
                        onChange={(e) => setTaskNewProjectDescription(e.target.value)}
                        placeholder="Projektbeschreibung"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Task Dependencies */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="taskEnableDependencies"
                checked={taskEnableDependencies}
                onCheckedChange={(checked) => setTaskEnableDependencies(checked as boolean)}
              />
              <Label htmlFor="taskEnableDependencies" className="cursor-pointer">
                Aufgabe verknüpfen
              </Label>
            </div>
            
            {taskEnableDependencies && (
              <div className="space-y-3 pl-6">
                <div>
                  <Label>Voraussetzungen (muss vorher erledigt sein)</Label>
                  <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                    {allTasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prereq-${task.id}`}
                          checked={taskPrerequisites.includes(task.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTaskPrerequisites([...taskPrerequisites, task.id]);
                            } else {
                              setTaskPrerequisites(taskPrerequisites.filter((id) => id !== task.id));
                            }
                          }}
                        />
                        <Label htmlFor={`prereq-${task.id}`} className="cursor-pointer text-sm">
                          {task.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Folgeaufgaben (muss danach erledigt werden)</Label>
                  <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                    {allTasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`followup-${task.id}`}
                          checked={taskFollowups.includes(task.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTaskFollowups([...taskFollowups, task.id]);
                            } else {
                              setTaskFollowups(taskFollowups.filter((id) => id !== task.id));
                            }
                          }}
                        />
                        <Label htmlFor={`followup-${task.id}`} className="cursor-pointer text-sm">
                          {task.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
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

      {/* Item Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel-Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{detailItem.name}</h3>
                <div className="mt-1">
                  <span 
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={getCategoryStyle(detailItem.categoryId)}
                  >
                    {getCategoryName(detailItem.categoryId)}
                  </span>
                </div>
              </div>
              
              {detailItem.details && (
                <div>
                  <Label className="text-muted-foreground">Details</Label>
                  <p className="text-sm">{detailItem.details}</p>
                </div>
              )}
              
              {detailItem.photoUrls && detailItem.photoUrls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Fotos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {normalizePhotoUrls(detailItem.photoUrls).map((photo, index) => (
                      <img 
                        key={index} 
                        src={photo.url} 
                        alt={photo.filename} 
                        className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Erstellt von</Label>
                <p className="text-sm">
                  {members.find(m => m.id === detailItem.addedBy)?.memberName || "Unbekannt"}
                </p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Erstellt am</Label>
                <p className="text-sm">
                  {new Date(detailItem.createdAt).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
              
              {detailItem.taskId && (
                <div>
                  <Label className="text-muted-foreground">Verknüpfte Aufgabe</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start mt-1"
                    onClick={() => {
                      setShowDetailDialog(false);
                      setLocation(`/tasks?taskId=${detailItem.taskId}`);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2 text-primary" />
                    {allTasks.find(t => t.id === detailItem.taskId)?.name || `Aufgabe #${detailItem.taskId}`}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </AppLayout>
  );
}

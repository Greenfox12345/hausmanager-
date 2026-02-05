import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "./PhotoUpload";
import { QuickCategoryCreate } from "./QuickCategoryCreate";
import { Loader2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";

// Helper function to normalize photoUrls to object format
const normalizePhotoUrls = (photoUrls: any): Array<{ url: string; filename: string }> => {
  if (!photoUrls || !Array.isArray(photoUrls)) return [];
  
  return photoUrls.map((item: any) => {
    if (typeof item === 'object' && item.url && item.filename) {
      return item;
    }
    if (typeof item === 'string') {
      const filename = item.split('/').pop() || 'unknown.jpg';
      return { url: item, filename };
    }
    return { url: String(item), filename: 'unknown.jpg' };
  });
};

interface ShoppingItem {
  id: number;
  name: string;
  details?: string | null;
  categoryId: number;
  photoUrls?: any;
}

interface CompleteShoppingItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShoppingItem[];
  onComplete: (data: {
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
  }) => Promise<void>;
}

export function CompleteShoppingItemDialog({
  open,
  onOpenChange,
  items,
  onComplete,
}: CompleteShoppingItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const prevOpenRef = useRef(open);
  
  const { household, member } = useCompatAuth();
  
  // Load shopping categories (use as inventory categories)
  const { data: inventoryCategories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && items.length > 0 }
  );
  
  // Load household members
  const { data: householdMembers = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && items.length > 0 }
  );
  
  // Items to inventory state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [inventoryData, setInventoryData] = useState<Record<number, {
    name: string;
    categoryId: number;
    details: string;
    photoUrls: {url: string, filename: string}[];
    ownershipType: "personal" | "household";
    ownerIds: number[];
  }>>({});

  // Reset form when dialog closes
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      setSelectedItems(new Set());
      setExpandedItems(new Set());
      setInventoryData({});
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleSubmit = async () => {
    // Validate: Check if all selected items have a valid category
    const invalidItems = Array.from(selectedItems).filter(itemId => {
      const data = inventoryData[itemId];
      return !data || !data.categoryId || data.categoryId === 0;
    });

    if (invalidItems.length > 0) {
      return; // Don't submit if there are invalid items
    }

    setIsSubmitting(true);
    try {
      const itemsToInventory = Array.from(selectedItems).map(itemId => ({
        itemId,
        name: inventoryData[itemId].name,
        categoryId: inventoryData[itemId].categoryId,
        details: inventoryData[itemId].details || undefined,
        photoUrls: inventoryData[itemId].photoUrls.length > 0 ? inventoryData[itemId].photoUrls : undefined,
        ownershipType: inventoryData[itemId].ownershipType,
        ownerIds: inventoryData[itemId].ownershipType === "personal" ? inventoryData[itemId].ownerIds : undefined,
      }));

      await onComplete({
        itemIds: items.map(item => item.id),
        itemsToInventory: itemsToInventory.length > 0 ? itemsToInventory : undefined,
      });

      // Reset form
      setSelectedItems(new Set());
      setExpandedItems(new Set());
      setInventoryData({});
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing shopping items:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedItems(new Set());
    setExpandedItems(new Set());
    setInventoryData({});
    onOpenChange(false);
  };

  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einkauf abschließen</DialogTitle>
          <DialogDescription>
            {items.length} Item(s) als eingekauft markieren
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Inventory Transfer Section */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Ins Inventar aufnehmen</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedItems.size === items.length) {
                        // Deselect all
                        setSelectedItems(new Set());
                        setExpandedItems(new Set());
                        setInventoryData({});
                      } else {
                        // Select all
                        const allIds = new Set(items.map((item: any) => item.id));
                        setSelectedItems(allIds);
                        // Initialize inventory data for all with photos from shopping items
                        const newInventoryData: typeof inventoryData = {};
                        items.forEach((item: any) => {
                          newInventoryData[item.id] = {
                            name: item.name,
                            categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                            details: item.details || "",
                            photoUrls: normalizePhotoUrls(item.photoUrls),
                            ownershipType: "household",
                            ownerIds: [],
                          };
                        });
                        setInventoryData(newInventoryData);
                      }
                    }}
                  >
                    {selectedItems.size === items.length ? "Alle abwählen" : "Alle auswählen"}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const allIds = new Set(items.map((item: any) => item.id));
                      setSelectedItems(allIds);
                      const newInventoryData: typeof inventoryData = {};
                      items.forEach((item: any) => {
                        newInventoryData[item.id] = {
                          name: item.name,
                          categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                          details: item.details || "",
                          photoUrls: normalizePhotoUrls(item.photoUrls),
                          ownershipType: "household",
                          ownerIds: [],
                        };
                      });
                      setInventoryData(newInventoryData);
                    }}
                  >
                    Alle ins Inventar
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Diese Items werden als eingekauft markiert. Wählen Sie aus, welche ins Inventar aufgenommen werden sollen:
              </p>
              <div className="space-y-3">
                {items.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedItems);
                          if (checked) {
                            newSelected.add(item.id);
                            // Initialize inventory data with defaults and copy photos from shopping item
                            setInventoryData(prev => ({
                              ...prev,
                              [item.id]: {
                                name: item.name,
                                categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                                details: item.details || "",
                                photoUrls: normalizePhotoUrls(item.photoUrls),
                                ownershipType: "household",
                                ownerIds: [],
                              }
                            }));
                          } else {
                            newSelected.delete(item.id);
                            const newExpanded = new Set(expandedItems);
                            newExpanded.delete(item.id);
                            setExpandedItems(newExpanded);
                            setInventoryData(prev => {
                              const newData = { ...prev };
                              delete newData[item.id];
                              return newData;
                            });
                          }
                          setSelectedItems(newSelected);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`item-${item.id}`} className="font-medium cursor-pointer">
                          {item.name}
                        </Label>
                        {item.details && (
                          <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                        )}
                        {selectedItems.has(item.id) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-auto py-1 px-2 text-xs"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            {expandedItems.has(item.id) ? (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Weniger anzeigen
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Details bearbeiten
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {!inventoryData[item.id]?.categoryId && selectedItems.has(item.id) && (
                        <span className="text-xs text-red-600 font-medium">Kategorie fehlt!</span>
                      )}
                    </div>

                    {/* Expanded form for inventory details */}
                    {selectedItems.has(item.id) && expandedItems.has(item.id) && (
                      <div className="pl-8 space-y-4 border-l-2 border-primary/20">
                        {/* Name */}
                        <div>
                          <Label htmlFor={`name-${item.id}`}>Name im Inventar</Label>
                          <Input
                            id={`name-${item.id}`}
                            value={inventoryData[item.id]?.name || ""}
                            onChange={(e) => {
                              setInventoryData(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  name: e.target.value,
                                }
                              }));
                            }}
                            placeholder="Name des Items"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <Label htmlFor={`category-${item.id}`}>
                            Kategorie *
                            {!inventoryData[item.id]?.categoryId && (
                              <span className="text-red-600 ml-1">(Pflichtfeld)</span>
                            )}
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={inventoryData[item.id]?.categoryId?.toString() || ""}
                              onValueChange={(value) => {
                                setInventoryData(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    categoryId: parseInt(value),
                                  }
                                }));
                              }}
                            >
                              <SelectTrigger className={!inventoryData[item.id]?.categoryId ? "border-red-500" : ""}>
                                <SelectValue placeholder="Kategorie wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryCategories.map((cat: any) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {household && member && (
                              <QuickCategoryCreate
                                householdId={household.householdId}
                                memberId={member.memberId}
                                onCategoryCreated={(categoryId) => {
                                  setInventoryData(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      categoryId,
                                    }
                                  }));
                                }}
                                type="inventory"
                              />
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div>
                          <Label htmlFor={`details-${item.id}`}>Details</Label>
                          <Textarea
                            id={`details-${item.id}`}
                            placeholder="z.B. Farbe, Größe, Zustand..."
                            value={inventoryData[item.id]?.details || ""}
                            onChange={(e) => {
                              setInventoryData(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  details: e.target.value,
                                }
                              }));
                            }}
                            rows={2}
                          />
                        </div>

                        {/* Ownership */}
                        <div>
                          <Label>Eigentum</Label>
                          <RadioGroup
                            value={inventoryData[item.id]?.ownershipType || "household"}
                            onValueChange={(value: "personal" | "household") => {
                              setInventoryData(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  ownershipType: value,
                                  ownerIds: value === "household" ? [] : prev[item.id]?.ownerIds || [],
                                }
                              }));
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="household" id={`household-${item.id}`} />
                              <Label htmlFor={`household-${item.id}`} className="font-normal cursor-pointer">
                                Haushalt (gemeinsam)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="personal" id={`personal-${item.id}`} />
                              <Label htmlFor={`personal-${item.id}`} className="font-normal cursor-pointer">
                                Persönlich
                              </Label>
                            </div>
                          </RadioGroup>

                          {inventoryData[item.id]?.ownershipType === "personal" && (
                            <div className="mt-3 pl-6 space-y-2">
                              <Label className="text-sm">Besitzer auswählen:</Label>
                              {householdMembers.map((member: any) => (
                                <div key={member.memberId} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`owner-${item.id}-${member.memberId}`}
                                    checked={inventoryData[item.id]?.ownerIds?.includes(member.memberId) || false}
                                    onCheckedChange={(checked) => {
                                      setInventoryData(prev => {
                                        const currentOwners = prev[item.id]?.ownerIds || [];
                                        const newOwners = checked
                                          ? [...currentOwners, member.memberId]
                                          : currentOwners.filter(id => id !== member.memberId);
                                        return {
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            ownerIds: newOwners,
                                          }
                                        };
                                      });
                                    }}
                                  />
                                  <Label
                                    htmlFor={`owner-${item.id}-${member.memberId}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {member.memberName}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Photos */}
                        <div>
                          <Label>Fotos</Label>
                          <PhotoUpload
                            photos={inventoryData[item.id]?.photoUrls || []}
                            onPhotosChange={(newPhotos) => {
                              setInventoryData(prev => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  photoUrls: newPhotos,
                                }
                              }));
                            }}
                            onUploadingChange={setIsUploading}
                            maxPhotos={5}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              {selectedItems.size > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800">
                    {selectedItems.size} Item(s) werden ins Inventar aufgenommen
                  </p>
                  <div className="text-xs text-green-700 space-y-1">
                    {Array.from(selectedItems).map(itemId => {
                      const item = items.find((i: any) => i.id === itemId);
                      const data = inventoryData[itemId];
                      const category = inventoryCategories.find((c: any) => c.id === data?.categoryId);
                      return (
                        <div key={itemId} className="flex items-center justify-between">
                          <span>• {data?.name || item?.name}</span>
                          <span className="text-muted-foreground">
                            {category?.name || "Keine Kategorie"} • {data?.ownershipType === "household" ? "Haushalt" : "Persönlich"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || isUploading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || (selectedItems.size > 0 && Array.from(selectedItems).some(itemId => !inventoryData[itemId]?.categoryId))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird abgeschlossen...
              </>
            ) : (
              "Abschließen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

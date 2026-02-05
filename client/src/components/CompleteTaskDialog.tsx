import { useState, useEffect, useRef, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "./PhotoUpload";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight, ShoppingBag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";

interface Task {
  id: number;
  name: string;
  description?: string;
}

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  taskId?: number;
  linkedShoppingItems?: any[];
  onComplete: (data: { 
    comment?: string; 
    photoUrls: {url: string, filename: string}[]; 
    fileUrls?: {url: string, filename: string}[];
    shoppingItemsToInventory?: {
      itemId: number;
      categoryId: number;
      details?: string;
      photoUrls?: {url: string, filename: string}[];
      ownershipType: "personal" | "household";
      ownerIds?: number[];
    }[];
  }) => Promise<void>;
}

const CompleteTaskDialogComponent = function CompleteTaskDialog({
  open,
  onOpenChange,
  task,
  taskId,
  linkedShoppingItems = [],
  onComplete,
}: CompleteTaskDialogProps) {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{url: string, filename: string}[]>([]);
  const [files, setFiles] = useState<{url: string, filename: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const prevOpenRef = useRef(open);
  
  const { household } = useCompatAuth();
  
  // Load shopping categories (use as inventory categories)
  const { data: inventoryCategories = [] } = trpc.shopping.listCategories.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && linkedShoppingItems.length > 0 }
  );
  
  // Load household members
  const { data: householdMembers = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && linkedShoppingItems.length > 0 }
  );
  
  // Shopping items to inventory state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [inventoryData, setInventoryData] = useState<Record<number, {
    categoryId: number;
    details: string;
    photoUrls: {url: string, filename: string}[];
    ownershipType: "personal" | "household";
    ownerIds: number[];
  }>>({});

  // Debug: Log photos state changes
  useEffect(() => {
    console.log('[CompleteTaskDialog] photos state changed:', photos);
  }, [photos]);

  // Callback for PhotoUpload with logging
  const handlePhotosChange = (newPhotos: {url: string, filename: string}[]) => {
    console.log('[CompleteTaskDialog] onPhotosChange called with:', newPhotos);
    setPhotos(newPhotos);
    console.log('[CompleteTaskDialog] setPhotos called');
  };

  // Reset form only when dialog closes (open changes from true to false)
  useEffect(() => {
    console.log('[CompleteTaskDialog] open changed:', { prev: prevOpenRef.current, current: open });
    if (prevOpenRef.current && !open) {
      // Dialog was just closed
      console.log('[CompleteTaskDialog] Resetting form');
      setComment("");
      setPhotos([]);
      setFiles([]);
      setSelectedItems(new Set());
      setExpandedItems(new Set());
      setInventoryData({});
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleSubmit = async () => {
    if (!task) return;

    // Validate: Check if all selected items have a valid category
    const invalidItems = Array.from(selectedItems).filter(itemId => {
      const data = inventoryData[itemId];
      return !data || !data.categoryId || data.categoryId === 0;
    });

    if (invalidItems.length > 0) {
      // Validation failed - this should not happen as button is disabled
      return;
    }

    setIsSubmitting(true);
    try {
      // Build shopping items to inventory array
      const shoppingItemsToInventory = Array.from(selectedItems).map(itemId => ({
        itemId,
        ...inventoryData[itemId],
      }));

      await onComplete({
        comment: comment.trim() || undefined,
        photoUrls: photos,
        fileUrls: files,
        shoppingItemsToInventory: shoppingItemsToInventory.length > 0 ? shoppingItemsToInventory : undefined,
      });
      // Reset form
      setComment("");
      setPhotos([]);
      setFiles([]);
      setSelectedItems(new Set());
      setExpandedItems(new Set());
      setInventoryData({});
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    setPhotos([]);
    setFiles([]);
    onOpenChange(false);
  };

  if (!task) return null;

  // Prevent closing dialog while uploading
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) {
      console.log('[CompleteTaskDialog] Prevented closing during upload');
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={`complete-content-${task?.id}`} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Aufgabe abschließen
          </DialogTitle>
          <DialogDescription>
            Sie sind dabei, die Aufgabe "{task.name}" als erledigt zu markieren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Aufgabe</Label>
              <p className="font-medium">{task.name}</p>
            </div>
            {task.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Beschreibung</Label>
                <p className="text-sm text-muted-foreground">{task?.description}</p>
              </div>
            )}
          </div>

          {/* Task details */}
          {false && task?.description && (
            <div className="space-y-2">
              <Label>Aufgabenbeschreibung:</Label>
              <div className="text-sm text-muted-foreground border rounded-lg p-3">
                {task?.description}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (optional)</Label>
            <Textarea
              id="comment"
              placeholder="z.B. Alles erledigt, hat 2 Stunden gedauert..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Fotos (optional)</Label>
            <PhotoUpload 
              photos={photos} 
              onPhotosChange={handlePhotosChange} 
              onUploadingChange={setIsUploading}
              maxPhotos={5} 
            />
          </div>

          {/* PDF upload */}
          <div className="space-y-2">
            <Label>PDFs (optional)</Label>
            <PhotoUpload 
              photos={files} 
              onPhotosChange={setFiles} 
              onUploadingChange={setIsUploading}
              maxPhotos={5}
              acceptedFileTypes=".pdf"
              fileTypeLabel="PDF"
            />
          </div>

          {/* Linked Shopping Items */}
          {linkedShoppingItems.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-semibold">Verknüpfte Einkaufsliste ({linkedShoppingItems.length})</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedItems.size === linkedShoppingItems.length) {
                        // Deselect all
                        setSelectedItems(new Set());
                        setExpandedItems(new Set());
                        setInventoryData({});
                      } else {
                        // Select all
                        const allIds = new Set(linkedShoppingItems.map((item: any) => item.id));
                        setSelectedItems(allIds);
                        // Initialize inventory data for all with photos from shopping items
                        const newInventoryData: typeof inventoryData = {};
                        linkedShoppingItems.forEach((item: any) => {
                          newInventoryData[item.id] = {
                            categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                            details: item.details || "",
                            photoUrls: item.photoUrls || [], // Copy photos from shopping item
                            ownershipType: "household",
                            ownerIds: [],
                          };
                        });
                        setInventoryData(newInventoryData);
                      }
                    }}
                  >
                    {selectedItems.size === linkedShoppingItems.length ? "Alle abwählen" : "Alle auswählen"}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // Select all and expand all
                      const allIds = new Set(linkedShoppingItems.map((item: any) => item.id));
                      setSelectedItems(allIds);
                      setExpandedItems(allIds);
                      // Initialize inventory data for all with photos from shopping items
                      const newInventoryData: typeof inventoryData = {};
                      linkedShoppingItems.forEach((item: any) => {
                        newInventoryData[item.id] = {
                          categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                          details: item.details || "",
                          photoUrls: item.photoUrls || [], // Copy photos from shopping item
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
                Diese Items werden von der Einkaufsliste entfernt. Wählen Sie aus, welche ins Inventar aufgenommen werden sollen:
              </p>
              <div className="space-y-3">
                {linkedShoppingItems.map((item: any) => {
                  const isInvalid = selectedItems.has(item.id) && (!inventoryData[item.id] || !inventoryData[item.id].categoryId || inventoryData[item.id].categoryId === 0);
                  return (
                  <div key={item.id} className={`border rounded-lg overflow-hidden ${isInvalid ? 'border-red-500 border-2' : ''}`}>
                    <div className="flex items-start gap-3 p-3 bg-muted/30">
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
                                categoryId: item.categoryId || (inventoryCategories[0]?.id ?? 0),
                                details: item.details || "",
                                photoUrls: item.photoUrls || [], // Copy photos from shopping item
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
                      </div>
                      {selectedItems.has(item.id) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newExpanded = new Set(expandedItems);
                            if (expandedItems.has(item.id)) {
                              newExpanded.delete(item.id);
                            } else {
                              newExpanded.add(item.id);
                            }
                            setExpandedItems(newExpanded);
                          }}
                        >
                          {expandedItems.has(item.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Expandable Inventory Form */}
                    {selectedItems.has(item.id) && expandedItems.has(item.id) && (
                      <div className="p-4 space-y-4 bg-background border-t">
                        <p className="text-sm font-medium text-muted-foreground">Inventar-Details</p>
                        
                        {/* Category */}
                        <div className="space-y-2">
                          <Label>Kategorie *</Label>
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
                            <SelectTrigger>
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
                        </div>
                        
                        {/* Details */}
                        <div className="space-y-2">
                          <Label>Zusätzliche Details (optional)</Label>
                          <Textarea
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
                        
                        {/* Ownership Type */}
                        <div className="space-y-2">
                          <Label>Besitz</Label>
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
                                Haushalt
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="personal" id={`personal-${item.id}`} />
                              <Label htmlFor={`personal-${item.id}`} className="font-normal cursor-pointer">
                                Persönlich
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        {/* Owner Selection (only for personal) */}
                        {inventoryData[item.id]?.ownershipType === "personal" && (
                          <div className="space-y-2">
                            <Label>Besitzer</Label>
                            <div className="space-y-2">
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
                                  <Label htmlFor={`owner-${item.id}-${member.memberId}`} className="font-normal cursor-pointer">
                                    {member.memberName}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Photo Upload */}
                        <div className="space-y-2">
                          <Label>Fotos (optional)</Label>
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
                  );
                })}
              </div>
              
              {/* Summary */}
              {selectedItems.size > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800">
                    {selectedItems.size} Item(s) werden ins Inventar aufgenommen
                  </p>
                  <div className="text-xs text-green-700 space-y-1">
                    {Array.from(selectedItems).map(itemId => {
                      const item = linkedShoppingItems.find((i: any) => i.id === itemId);
                      const data = inventoryData[itemId];
                      const category = inventoryCategories.find((c: any) => c.id === data?.categoryId);
                      return (
                        <div key={itemId} className="flex items-center justify-between">
                          <span>• {item?.name}</span>
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

        {/* Validation Warning */}
        {(() => {
          const invalidItems = Array.from(selectedItems).filter(itemId => {
            const data = inventoryData[itemId];
            return !data || !data.categoryId || data.categoryId === 0;
          });
          
          if (invalidItems.length > 0) {
            return (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ Fehlende Kategorien
                </p>
                <p className="text-xs text-red-700">
                  {invalidItems.length} Item(s) haben keine Kategorie ausgewählt. Bitte wählen Sie für alle Items eine Kategorie aus.
                </p>
              </div>
            );
          }
          return null;
        })()}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isUploading || (() => {
              const invalidItems = Array.from(selectedItems).filter(itemId => {
                const data = inventoryData[itemId];
                return !data || !data.categoryId || data.categoryId === 0;
              });
              return invalidItems.length > 0;
            })()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              "Aufgabe abschließen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CompleteTaskDialog = CompleteTaskDialogComponent;

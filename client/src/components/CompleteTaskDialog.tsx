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
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Verknüpfte Einkaufsliste ({linkedShoppingItems.length})</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Diese Items werden von der Einkaufsliste entfernt. Wählen Sie aus, welche ins Inventar aufgenommen werden sollen:
              </p>
              <div className="space-y-2">
                {linkedShoppingItems.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedItems);
                        if (checked) {
                          newSelected.add(item.id);
                          // Initialize inventory data with defaults
                          setInventoryData(prev => ({
                            ...prev,
                            [item.id]: {
                              categoryId: item.categoryId,
                              details: item.details || "",
                              photoUrls: [],
                              ownershipType: "household",
                              ownerIds: [],
                            }
                          }));
                        } else {
                          newSelected.delete(item.id);
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
                  </div>
                ))}
              </div>
              {selectedItems.size > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  {selectedItems.size} Item(s) werden ins Inventar aufgenommen
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
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

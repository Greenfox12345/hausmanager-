import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BorrowReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowRequestId: number;
  itemId: number;
  itemName: string;
  onSuccess?: () => void;
}

interface ChecklistState {
  [key: string]: boolean;
}

interface PhotoState {
  [key: string]: {
    file?: File;
    preview?: string;
    uploaded?: boolean;
  };
}

export function BorrowReturnDialog({
  open,
  onOpenChange,
  borrowRequestId,
  itemId,
  itemName,
  onSuccess,
}: BorrowReturnDialogProps) {
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [photoState, setPhotoState] = useState<PhotoState>({});
  const [conditionReport, setConditionReport] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Load guidelines
  const { data: guidelines } = trpc.borrow.getGuidelines.useQuery(
    { itemId },
    { enabled: open && !!itemId }
  );

  const returnMutation = trpc.borrow.markReturned.useMutation();

  // Initialize checklist state
  useEffect(() => {
    if (guidelines?.checklistItems) {
      const initialState: ChecklistState = {};
      (guidelines.checklistItems as any[]).forEach((item: any) => {
        initialState[item.id] = false;
      });
      setChecklistState(initialState);
    }
  }, [guidelines]);

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklistState((prev) => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  const handlePhotoSelect = (reqId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setPhotoState((prev) => ({
      ...prev,
      [reqId]: { file, preview, uploaded: false },
    }));
  };

  const handlePhotoRemove = (reqId: string) => {
    if (photoState[reqId]?.preview) {
      URL.revokeObjectURL(photoState[reqId].preview!);
    }
    setPhotoState((prev) => {
      const newState = { ...prev };
      delete newState[reqId];
      return newState;
    });
  };

  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required checklist items
    if (guidelines?.checklistItems) {
      (guidelines.checklistItems as any[]).forEach((item: any) => {
        if (item.required && !checklistState[item.id]) {
          errors.push(`Checkliste: "${item.label}" muss abgehakt sein`);
        }
      });
    }

    // Check required photos
    if (guidelines?.photoRequirements) {
      (guidelines.photoRequirements as any[]).forEach((req: any) => {
        if (req.required && !photoState[req.id]?.file) {
          errors.push(`Foto erforderlich: "${req.label}"`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    try {
      setIsUploading(true);

      // Upload photos to S3 first
      const uploadedPhotos: Array<{ requirementId: string; photoUrl: string }> = [];
      
      for (const [reqId, photo] of Object.entries(photoState)) {
        if (photo.file) {
          const arrayBuffer = await photo.file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...Array.from(buffer)));

          const result = await trpc.useUtils().client.storage.upload.mutate({
            key: `borrow-returns/${borrowRequestId}/${reqId}-${photo.file.name}`,
            data: base64,
            contentType: photo.file.type,
          });

          uploadedPhotos.push({
            requirementId: reqId,
            photoUrl: result.url,
          });
        }
      }

      // Submit return
      await returnMutation.mutateAsync({
        requestId: borrowRequestId,
        returnPhotos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        conditionReport: conditionReport.trim() || undefined,
      });

      toast.success("Item erfolgreich zurückgegeben");
      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setChecklistState({});
      setPhotoState({});
      setConditionReport("");
    } catch (error: any) {
      console.error("Return error:", error);
      toast.error(error.message || "Fehler beim Zurückgeben");
    } finally {
      setIsUploading(false);
    }
  };

  const checklistItems = (guidelines?.checklistItems as any[]) || [];
  const photoRequirements = (guidelines?.photoRequirements as any[]) || [];
  const hasGuidelines = checklistItems.length > 0 || photoRequirements.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item zurückgeben</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item</Label>
            <div className="text-sm text-muted-foreground">{itemName}</div>
          </div>

          {!hasGuidelines && (
            <div className="text-sm text-muted-foreground">
              Keine Rückgabevorgaben definiert.
            </div>
          )}

          {/* Checklist */}
          {checklistItems.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <Label className="text-sm font-medium">Checkliste</Label>
                </div>
                {checklistItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={checklistState[item.id] || false}
                      onCheckedChange={(checked) =>
                        handleChecklistChange(item.id, !!checked)
                      }
                    />
                    <span className="text-sm">
                      {item.label}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Photo Requirements */}
          {photoRequirements.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <Label className="text-sm font-medium">Erforderliche Fotos</Label>
                </div>
                {photoRequirements.map((req: any) => (
                  <div key={req.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Label className="text-sm">
                          {req.label}
                          {req.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {req.examplePhotoUrl && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">
                              Beispiel:
                            </div>
                            <img
                              src={req.examplePhotoUrl}
                              alt="Beispiel"
                              className="h-20 w-20 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {photoState[req.id]?.preview ? (
                          <div className="relative">
                            <img
                              src={photoState[req.id].preview}
                              alt="Vorschau"
                              className="h-20 w-20 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => handlePhotoRemove(req.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handlePhotoSelect(req.id, file);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="pointer-events-none"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Foto hochladen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Condition Report */}
          <div className="space-y-2">
            <Label htmlFor="condition-report">Zustandsbericht (optional)</Label>
            <Textarea
              id="condition-report"
              placeholder="Beschreibe den Zustand des Items bei der Rückgabe..."
              value={conditionReport}
              onChange={(e) => setConditionReport(e.target.value)}
              rows={3}
            />
          </div>

          {hasGuidelines && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <span className="text-destructive">*</span> = Pflichtfeld
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || returnMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || returnMutation.isPending}
          >
            {isUploading || returnMutation.isPending
              ? "Wird zurückgegeben..."
              : "Zurückgeben"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

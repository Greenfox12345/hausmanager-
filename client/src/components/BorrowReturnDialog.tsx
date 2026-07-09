import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, Upload, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";
import { useTranslation } from "react-i18next";
import { QuantityInput } from "@/components/QuantityInput";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { formatQuantity } from "@/components/QuantityInput";

interface BorrowReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowRequestId: number;
  itemId: number;
  itemName: string;
  /** Total quantity that was borrowed */
  loanQuantity?: number | null;
  /** How much has already been returned */
  returnedQuantity?: number;
  /** Unit symbol/name for display */
  unitLabel?: string | null;
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
  loanQuantity,
  returnedQuantity = 0,
  unitLabel,
  onSuccess,
}: BorrowReturnDialogProps) {
  const { t } = useTranslation(["borrow", "common"]);
  const { currentHousehold } = useUserAuth();
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [photoState, setPhotoState] = useState<PhotoState>({});
  const [conditionReport, setConditionReport] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Partial return state
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialQty, setPartialQty] = useState<number | null>(null);
  const [partialNote, setPartialNote] = useState("");

  const remaining = loanQuantity !== null && loanQuantity !== undefined
    ? loanQuantity - returnedQuantity
    : null;

  // Reset partial qty when dialog opens
  useEffect(() => {
    if (open && remaining !== null) {
      setPartialQty(remaining);
    }
  }, [open, remaining]);

  // Load guidelines
  const { data: guidelines } = trpc.borrow.getGuidelines.useQuery(
    { itemId },
    { enabled: open && !!itemId }
  );

  const returnMutation = trpc.borrow.markReturned.useMutation();
  const partialReturnMutation = trpc.borrow.partialReturn.useMutation();
  const uploadMutation = trpc.storage.upload.useMutation();
  const utils = trpc.useUtils();

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
    if (guidelines?.checklistItems) {
      (guidelines.checklistItems as any[]).forEach((item: any) => {
        if (item.required && !checklistState[item.id]) {
          errors.push(t("borrow:returnDialog.checklistRequired", { label: item.label }));
        }
      });
    }
    if (guidelines?.photoRequirements) {
      (guidelines.photoRequirements as any[]).forEach((req: any) => {
        if (req.required && !photoState[req.id]?.file) {
          errors.push(t("borrow:returnDialog.photoRequired", { label: req.label }));
        }
      });
    }
    return { valid: errors.length === 0, errors };
  };

  /** Handle partial return (does NOT close the dialog) */
  const handlePartialReturn = async () => {
    if (!partialQty || partialQty < 1) return;
    if (remaining !== null && partialQty > remaining) {
      toast.error(t("borrow:quantity.exceedsAvailable", { max: remaining }));
      return;
    }
    try {
      const result = await partialReturnMutation.mutateAsync({
        requestId: borrowRequestId,
        returnQty: partialQty,
        memberId: currentHousehold?.memberId,
        note: partialNote.trim() || undefined,
      });

      if (result.isFullyReturned) {
        toast.success(t("borrow:returnDialog.partialFullyReturned"));
        utils.borrow.getMyBorrows.invalidate();
        utils.borrow.getLentItems.invalidate();
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.success(
          t("borrow:returnDialog.partialSuccess", {
            returned: partialQty,
            remaining: result.remainingQuantity,
            unit: unitLabel ?? t("borrow:quantity.units"),
          })
        );
        // Update remaining, keep collapsible open for next partial return
        setPartialQty(result.remainingQuantity);
        setPartialNote("");
        // Keep partialOpen = true – do NOT close dialog
        utils.borrow.getMyBorrows.invalidate();
        utils.borrow.getLentItems.invalidate();
        // Do NOT call onSuccess or close dialog
      }
    } catch (error: any) {
      toast.error(error.message || t("borrow:returnDialog.error"));
    }
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    try {
      setIsUploading(true);

      const uploadedPhotos: Array<{ requirementId: string; photoUrl: string }> = [];
      for (const [reqId, photo] of Object.entries(photoState)) {
        if (photo.file) {
          const compressedFile = await compressImage(photo.file);
          const arrayBuffer = await compressedFile.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...Array.from(buffer)));
          const result = await uploadMutation.mutateAsync({
            key: `borrow-returns/${borrowRequestId}/${reqId}-${compressedFile.name}`,
            data: base64,
            contentType: compressedFile.type,
          });
          uploadedPhotos.push({ requirementId: reqId, photoUrl: result.url });
        }
      }

      await returnMutation.mutateAsync({
        requestId: borrowRequestId,
        returnPhotos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        conditionReport: conditionReport.trim() || undefined,
      });

      toast.success(t("borrow:returnDialog.success"));
      onSuccess?.();
      onOpenChange(false);

      setChecklistState({});
      setPhotoState({});
      setConditionReport("");
    } catch (error: any) {
      console.error("Return error:", error);
      toast.error(error.message || t("borrow:returnDialog.error"));
    } finally {
      setIsUploading(false);
    }
  };

  const checklistItems = (guidelines?.checklistItems as any[]) || [];
  const photoRequirements = (guidelines?.photoRequirements as any[]) || [];
  const hasGuidelines = checklistItems.length > 0 || photoRequirements.length > 0;
  const hasQuantity = loanQuantity !== null && loanQuantity !== undefined && loanQuantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("borrow:returnDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("borrow:returnDialog.item")}</Label>
            <div className="text-sm text-muted-foreground">{itemName}</div>
          </div>

          {/* Quantity summary */}
          {hasQuantity && (
            <div className="flex items-center gap-3 text-sm bg-muted/50 rounded p-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {t("borrow:returnDialog.quantitySummary", {
                  loan: formatQuantity(loanQuantity),
                  returned: formatQuantity(returnedQuantity),
                  remaining: formatQuantity(remaining),
                  unit: unitLabel ?? "",
                })}
              </span>
            </div>
          )}

          {/* Partial return collapsible */}
          {hasQuantity && remaining !== null && remaining > 0 && (
            <Collapsible open={partialOpen} onOpenChange={setPartialOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span>{t("borrow:returnDialog.partialReturn")}</span>
                  {partialOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">{t("borrow:quantity.label")}</Label>
                  <QuantityInput
                    value={partialQty}
                    onChange={setPartialQty}
                    units={[]}
                    unitId={null}
                    onUnitChange={() => {}}
                    showUnitSelector={false}
                    max={remaining}
                    alwaysShow
                  />
                  {unitLabel && (
                    <span className="text-xs text-muted-foreground">{unitLabel}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partial-note" className="text-sm">{t("borrow:returnDialog.partialNote")}</Label>
                  <Textarea
                    id="partial-note"
                    placeholder={t("borrow:returnDialog.partialNotePlaceholder")}
                    value={partialNote}
                    onChange={(e) => setPartialNote(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handlePartialReturn}
                  disabled={partialReturnMutation.isPending || !partialQty || partialQty < 1}
                >
                  {partialReturnMutation.isPending
                    ? t("borrow:returnDialog.returning")
                    : t("borrow:returnDialog.confirmPartial")}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          )}

          {!hasGuidelines && (
            <div className="text-sm text-muted-foreground">
              {t("borrow:returnDialog.noGuidelines")}
            </div>
          )}

          {/* Checklist */}
          {checklistItems.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <Label className="text-sm font-medium">{t("borrow:returnDialog.checklist")}</Label>
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
                  <Label className="text-sm font-medium">{t("borrow:returnDialog.requiredPhotos")}</Label>
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
                              {t("borrow:returnDialog.example")}:
                            </div>
                            <img
                              src={req.examplePhotoUrl}
                              alt={t("common:labels.preview")}
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
                              alt={t("common:labels.preview")}
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
                                if (file) handlePhotoSelect(req.id, file);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="pointer-events-none"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t("borrow:returnDialog.uploadPhoto")}
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
            <Label htmlFor="condition-report">{t("borrow:returnDialog.conditionReport")}</Label>
            <Textarea
              id="condition-report"
              placeholder={t("borrow:returnDialog.conditionReportPlaceholder")}
              value={conditionReport}
              onChange={(e) => setConditionReport(e.target.value)}
              rows={3}
            />
          </div>

          {hasGuidelines && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <span className="text-destructive">*</span> = {t("borrow:returnDialog.required")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || returnMutation.isPending}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || returnMutation.isPending}
          >
            {isUploading || returnMutation.isPending
              ? t("borrow:returnDialog.returning")
              : t("borrow:returnDialog.return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

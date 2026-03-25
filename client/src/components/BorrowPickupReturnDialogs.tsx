/*
 * BorrowPickupReturnDialogs.tsx
 *
 * Two dialogs:
 *  - PickupDialog: shown when borrower confirms they picked up the item
 *    → shows item photo, description, borrow guidelines/checklist/photo-requirements, allows photo + comment
 *  - ReturnDialog: shown when borrower returns the item
 *    → shows pickup photo/comment prominently for comparison, then guidelines + return photo + comment
 */
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, ImageIcon, Loader2, PackageCheck, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── shared photo capture helper ────────────────────────────────────────────

function PhotoCapture({
  label,
  photoPreview,
  onPhoto,
}: {
  label: string;
  photoPreview: string | null;
  onPhoto: (base64: string, filename: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.82);
        onPhoto(base64, file.name);
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer",
          "hover:border-primary/60 transition-colors",
          photoPreview ? "border-primary/40 h-40" : "h-28 flex items-center justify-center"
        )}
        onClick={() => fileRef.current?.click()}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-sm">
            <Camera className="h-6 w-6" />
            <span>Foto aufnehmen / auswählen</span>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Guideline section (shared between both dialogs) ─────────────────────────

function GuidelineSection({
  guideline,
  checkedItems,
  onToggleCheck,
  showChecklist = true,
}: {
  guideline: BorrowRequestDetail["guideline"];
  checkedItems: Set<string>;
  onToggleCheck: (id: string, checked: boolean) => void;
  showChecklist?: boolean;
}) {
  if (!guideline) return null;

  const { instructionsText, checklistItems, photoRequirements } = guideline;
  const hasContent = instructionsText || (checklistItems && checklistItems.length > 0) || (photoRequirements && photoRequirements.length > 0);
  if (!hasContent) return null;

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-3">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        Ausleihvorgaben
      </p>

      {/* Instructions text */}
      {instructionsText && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{instructionsText}</p>
      )}

      {/* Checklist */}
      {showChecklist && checklistItems && checklistItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Checkliste</p>
          {checklistItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
              <input
                type="checkbox"
                checked={checkedItems.has(item.id)}
                onChange={(e) => onToggleCheck(item.id, e.target.checked)}
                className="rounded"
              />
              <span>{item.label}</span>
              {item.required && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">
                  Pflicht
                </Badge>
              )}
            </label>
          ))}
        </div>
      )}

      {/* Photo requirements */}
      {photoRequirements && photoRequirements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Erforderliche Fotos</p>
          <div className="space-y-2">
            {photoRequirements.map((req) => (
              <div key={req.id} className="flex items-center gap-2 text-sm">
                <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{req.label}</span>
                {req.required && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">
                    Pflicht
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface BorrowRequestDetail {
  id: number;
  status: string;
  itemName: string;
  itemPhotoUrl?: string | null;
  itemDescription?: string | null;
  borrowerName: string;
  startDate: Date | string;
  endDate: Date | string;
  requestMessage?: string | null;
  pickupComment?: string | null;
  pickupPhotoUrl?: string | null;
  returnComment?: string | null;
  returnPhotoUrl?: string | null;
  guideline?: {
    instructionsText?: string | null;
    checklistItems?: Array<{ id: string; label: string; required: boolean }> | null;
    photoRequirements?: Array<{ id: string; label: string; required: boolean }> | null;
  } | null;
}

// ─── PickupDialog ────────────────────────────────────────────────────────────

interface PickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: BorrowRequestDetail;
  memberId: number;
  onSuccess: () => void;
}

export function PickupDialog({ open, onOpenChange, request, memberId, onSuccess }: PickupDialogProps) {
  const { t } = useTranslation("borrows");
  const [comment, setComment] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoFilename, setPhotoFilename] = useState<string>("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const confirmPickup = trpc.borrow.confirmPickup.useMutation({
    onSuccess: () => {
      toast.success(t("pickup.success", "Abholung bestätigt!"));
      utils.borrow.invalidate();
      onSuccess();
      onOpenChange(false);
      setComment("");
      setPhotoBase64(null);
      setCheckedItems(new Set());
    },
    onError: (err) => toast.error(err.message),
  });

  const checklist = request.guideline?.checklistItems ?? [];
  const requiredChecked = checklist.filter((c) => c.required).every((c) => checkedItems.has(c.id));

  const handleToggleCheck = (id: string, checked: boolean) => {
    const next = new Set(checkedItems);
    checked ? next.add(id) : next.delete(id);
    setCheckedItems(next);
  };

  const handleSubmit = () => {
    confirmPickup.mutate({
      requestId: request.id,
      memberId,
      comment: comment || undefined,
      photoBase64: photoBase64 || undefined,
      photoFilename: photoFilename || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: "90dvh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-green-600" />
            {t("pickup.title", "Abholung bestätigen")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Item info */}
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            {request.itemPhotoUrl ? (
              <img
                src={request.itemPhotoUrl}
                alt={request.itemName}
                className="w-16 h-16 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold">{request.itemName}</p>
              {request.itemDescription && (
                <p className="text-sm text-muted-foreground line-clamp-2">{request.itemDescription}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(request.startDate).toLocaleDateString("de-DE")} –{" "}
                {new Date(request.endDate).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>

          {/* Ausleihvorgaben */}
          <GuidelineSection
            guideline={request.guideline}
            checkedItems={checkedItems}
            onToggleCheck={handleToggleCheck}
            showChecklist={true}
          />

          <div className="h-px bg-border" />

          {/* Photo */}
          <PhotoCapture
            label={t("pickup.photoLabel", "Foto bei Abholung (optional)")}
            photoPreview={photoBase64}
            onPhoto={(b64, name) => { setPhotoBase64(b64); setPhotoFilename(name); }}
          />

          {/* Comment */}
          <div className="space-y-1">
            <Label>{t("pickup.commentLabel", "Kommentar (optional)")}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("pickup.commentPlaceholder", "z.B. Zustand bei Abholung, Besonderheiten…")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmPickup.isPending}>
            {t("common.cancel", "Abbrechen")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={confirmPickup.isPending || !requiredChecked}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {confirmPickup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {t("pickup.confirm", "Abholung bestätigen")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ReturnDialog ─────────────────────────────────────────────────────────────

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: BorrowRequestDetail;
  memberId: number;
  onSuccess: () => void;
}

export function ReturnDialog({ open, onOpenChange, request, memberId, onSuccess }: ReturnDialogProps) {
  const { t } = useTranslation("borrows");
  const [comment, setComment] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoFilename, setPhotoFilename] = useState<string>("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const confirmReturn = trpc.borrow.confirmReturn.useMutation({
    onSuccess: () => {
      toast.success(t("return.success", "Rückgabe bestätigt!"));
      utils.borrow.invalidate();
      onSuccess();
      onOpenChange(false);
      setComment("");
      setPhotoBase64(null);
      setCheckedItems(new Set());
    },
    onError: (err) => toast.error(err.message),
  });

  const checklist = request.guideline?.checklistItems ?? [];
  const requiredChecked = checklist.filter((c) => c.required).every((c) => checkedItems.has(c.id));

  const handleToggleCheck = (id: string, checked: boolean) => {
    const next = new Set(checkedItems);
    checked ? next.add(id) : next.delete(id);
    setCheckedItems(next);
  };

  const handleSubmit = () => {
    confirmReturn.mutate({
      requestId: request.id,
      memberId,
      comment: comment || undefined,
      photoBase64: photoBase64 || undefined,
      photoFilename: photoFilename || undefined,
    });
  };

  const hasPickupData = !!(request.pickupPhotoUrl || request.pickupComment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: "90dvh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-blue-600" />
            {t("return.title", "Rückgabe bestätigen")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Item info */}
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            {request.itemPhotoUrl ? (
              <img
                src={request.itemPhotoUrl}
                alt={request.itemName}
                className="w-16 h-16 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold">{request.itemName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(request.startDate).toLocaleDateString("de-DE")} –{" "}
                {new Date(request.endDate).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>

          {/* ── Zustand bei Abholung (Vergleichsbereich) ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
              <Label className="text-sm font-semibold">
                {t("return.pickupRecord", "Zustand bei Abholung")}
              </Label>
            </div>

            {hasPickupData ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                {request.pickupPhotoUrl && (
                  <img
                    src={request.pickupPhotoUrl}
                    alt={t("return.pickupPhoto", "Foto bei Abholung")}
                    className="w-full max-h-52 object-cover rounded-md"
                  />
                )}
                {request.pickupComment && (
                  <p className="text-sm italic text-muted-foreground">
                    &bdquo;{request.pickupComment}&ldquo;
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-muted/40 border border-dashed rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  {t("return.noPickupData", "Kein Foto / Kommentar bei Abholung hinterlegt")}
                </p>
              </div>
            )}
          </div>

          {/* Vergleichs-Trennlinie */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground px-2 shrink-0">
              {t("return.compareHint", "Jetzt bei Rückgabe festhalten")} ↓
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Zustand bei Rückgabe ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <Label className="text-sm font-semibold">
                {t("return.returnRecord", "Zustand bei Rückgabe")}
              </Label>
            </div>
          </div>

          {/* Ausleihvorgaben (Rückgabe-Hinweise + Checkliste + Foto-Anforderungen) */}
          <GuidelineSection
            guideline={request.guideline}
            checkedItems={checkedItems}
            onToggleCheck={handleToggleCheck}
            showChecklist={true}
          />

          {/* Return photo */}
          <PhotoCapture
            label={t("return.photoLabel", "Foto bei Rückgabe (optional)")}
            photoPreview={photoBase64}
            onPhoto={(b64, name) => { setPhotoBase64(b64); setPhotoFilename(name); }}
          />

          {/* Return comment */}
          <div className="space-y-1">
            <Label>{t("return.commentLabel", "Kommentar (optional)")}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("return.commentPlaceholder", "z.B. Zustand bei Rückgabe, Anmerkungen…")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmReturn.isPending}>
            {t("common.cancel", "Abbrechen")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={confirmReturn.isPending || !requiredChecked}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {confirmReturn.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Undo2 className="h-4 w-4 mr-2" />
            )}
            {t("return.confirm", "Rückgabe bestätigen")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

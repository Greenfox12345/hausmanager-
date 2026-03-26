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
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ShoppingItem {
  id: number;
  name: string;
  category: string;
}

interface CompleteShoppingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ShoppingItem[];
  onComplete: (data: { comment?: string; photoUrls: {url: string, filename: string}[] }) => Promise<void>;
}

const CompleteShoppingDialogComponent = function CompleteShoppingDialog({
  open,
  onOpenChange,
  items,
  onComplete,
}: CompleteShoppingDialogProps) {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{url: string, filename: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const prevOpenRef = useRef(open);
  const { t } = useTranslation("shopping");

  // Callback for PhotoUpload with logging
  const handlePhotosChange = (newPhotos: {url: string, filename: string}[]) => {
    console.log("[CompleteShoppingDialog] onPhotosChange called with:", newPhotos);
    setPhotos(newPhotos);
    console.log("[CompleteShoppingDialog] setPhotos called");
  };

  // Reset form only when dialog closes (open changes from true to false)
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Dialog was just closed
      setComment("");
      setPhotos([]);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        comment: comment.trim() || undefined,
        photoUrls: photos,
      });
      // Reset form
      setComment("");
      setPhotos([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing shopping:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    setPhotos([]);
    onOpenChange(false);
  };

  // Prevent closing dialog while uploading
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) {
      console.log("[CompleteShoppingDialog] Prevented closing during upload");
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key="complete-shopping-content" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shopping:completeShoppingDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("shopping:completeShoppingDialog.description", { count: items.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Items list */}
          <div className="space-y-2">
            <Label>{t("shopping:completeShoppingDialog.purchasedItemsLabel")}</Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-1">
              {items.map((item) => (
                <div key={item.id} className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{item.category}:</span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">{t("shopping:completeShoppingDialog.commentLabel")}</Label>
            <Textarea
              id="comment"
              placeholder={t("shopping:completeShoppingDialog.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>{t("shopping:completeShoppingDialog.photosLabel")}</Label>
            <PhotoUpload 
              photos={photos} 
              onPhotosChange={handlePhotosChange} 
              onUploadingChange={setIsUploading}
              maxPhotos={3} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {t("shopping:completeShoppingDialog.cancelButton")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("shopping:completeShoppingDialog.savingButton")}
              </>
            ) : (
              t("shopping:completeShoppingDialog.completeButton")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CompleteShoppingDialog = CompleteShoppingDialogComponent;

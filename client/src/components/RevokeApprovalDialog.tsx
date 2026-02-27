import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface RevokeApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

export function RevokeApprovalDialog({
  open,
  onOpenChange,
  itemName,
  borrowerName,
  startDate,
  endDate,
  onConfirm,
  isSubmitting = false,
}: RevokeApprovalDialogProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Genehmigung widerrufen
          </DialogTitle>
          <DialogDescription>
            Die Ausleihgenehmigung wird widerrufen und der Verantwortliche wird benachrichtigt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3 bg-muted/50 text-sm space-y-1">
            <div><span className="font-medium">Gegenstand:</span> {itemName}</div>
            <div><span className="font-medium">Ausleiher:</span> {borrowerName}</div>
            <div><span className="font-medium">Zeitraum:</span> {startDate} - {endDate}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revoke-reason" className="font-medium">
              Begr\u00fcndung <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="revoke-reason"
              placeholder="Bitte gib eine Begr\u00fcndung f\u00fcr den Widerruf an..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {reason.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                Eine Begr\u00fcndung ist erforderlich, um die Genehmigung zu widerrufen.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? "Wird widerrufen..." : "Widerrufen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

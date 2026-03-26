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
import { useTranslation } from "react-i18next";

interface RevokeApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  taskId?: number;
  taskName?: string;
  occurrenceNumber?: number;
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
  taskId,
  taskName,
  occurrenceNumber,
  onConfirm,
  isSubmitting = false,
}: RevokeApprovalDialogProps) {
  const { t } = useTranslation(["borrow", "common"]);
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
            {t("borrow:revokeDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("borrow:revokeDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3 bg-muted/50 text-sm space-y-1">
            <div><span className="font-medium">{t("borrow:revokeDialog.item")}:</span> {itemName}</div>
            <div><span className="font-medium">{t("borrow:revokeDialog.borrower")}:</span> {borrowerName}</div>
            <div><span className="font-medium">{t("borrow:revokeDialog.period")}:</span> {startDate} - {endDate}</div>
            {taskName && (
              <div><span className="font-medium">{t("borrow:task")}:</span> {taskName}{occurrenceNumber ? ` (${t("borrow:occurrence")} ${occurrenceNumber})` : ""}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="revoke-reason" className="font-medium">
              {t("borrow:revokeDialog.reason")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="revoke-reason"
              placeholder={t("borrow:revokeDialog.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {reason.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("borrow:revokeDialog.reasonRequired")}
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
            {t("common:actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? t("borrow:revokeDialog.revoking") : t("borrow:revokeDialog.revoke")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

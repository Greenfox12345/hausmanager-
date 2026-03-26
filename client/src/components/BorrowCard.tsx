import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, User, PackageCheck, Undo2, ImageIcon, X, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PhotoLightbox, ClickablePhoto } from "@/components/PhotoLightbox";

const statusColors: Record<string, string> = {
  pending:   "bg-amber-400 text-white",
  approved:  "bg-blue-500 text-white",
  active:    "bg-green-500 text-white",
  completed: "bg-gray-500 text-white",
  returned:  "bg-gray-500 text-white",
  rejected:  "bg-red-400 text-white",
  cancelled: "bg-gray-300 text-gray-600",
};

export interface BorrowCardData {
  id: number;
  itemName: string;
  itemPhotoUrl?: string | null;
  itemDescription?: string | null;
  ownerName?: string;
  borrowerName?: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  responseMessage?: string | null;
  pickupPhotoUrl?: string | null;
  pickupComment?: string | null;
  returnPhotoUrl?: string | null;
  returnComment?: string | null;
  guideline?: any;
}

interface BorrowCardProps {
  borrow: BorrowCardData;
  /** If provided, shows an X button in the top-right corner */
  onClose?: () => void;
  onPickup?: (borrow: BorrowCardData) => void;
  onReturn?: (borrow: BorrowCardData) => void;
  /** Called when the user confirms cancellation; parent handles the mutation */
  onCancel?: (borrow: BorrowCardData) => void;
  /** While a cancel mutation is running */
  isCancelling?: boolean;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function BorrowCard({ borrow, onClose, onPickup, onReturn, onCancel, isCancelling }: BorrowCardProps) {
  const { t } = useTranslation(["borrows", "common"]);
  const [lightbox, setLightbox] = useState<{ photos: { url: string; label?: string }[]; currentIndex: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canCancel = (borrow.status === "pending" || borrow.status === "approved") && !!onCancel;

  return (
    <>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {borrow.itemPhotoUrl ? (
                <img
                  src={borrow.itemPhotoUrl}
                  alt={borrow.itemName}
                  className="w-12 h-12 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{borrow.itemName}</CardTitle>
                {borrow.ownerName && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <User className="w-3 h-3 inline mr-1" />
                    {t("borrows:fields.owner", "Eigentümer")}: {borrow.ownerName}
                  </p>
                )}
                {borrow.borrowerName && !borrow.ownerName && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <User className="w-3 h-3 inline mr-1" />
                    {t("borrows:fields.borrower", "Ausleiher")}: {borrow.borrowerName}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {borrow.status === "active" && borrow.endDate && new Date(borrow.endDate) < new Date() && (
              <Badge className="bg-red-600 text-white text-xs">
                {t("borrows:status.overdue", "Überfällig")}
              </Badge>
            )}
            <Badge className={statusColors[borrow.status] ?? ""}>
              {t(`borrows:status.${borrow.status}`, borrow.status)}
            </Badge>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 shrink-0"
                onClick={onClose}
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{t("borrows:fields.startDate", "Von")}: {formatDate(borrow.startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{t("borrows:fields.endDate", "Bis")}: {formatDate(borrow.endDate)}</span>
          </div>
        </div>

        {/* Pickup record */}
        {(borrow.status === "active" || borrow.status === "completed") &&
          (borrow.pickupPhotoUrl || borrow.pickupComment) && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400 mb-1">
              {t("borrows:pickupRecord", "Bei Abholung festgehalten")}
            </p>
            {borrow.pickupPhotoUrl && (
              <ClickablePhoto
                src={borrow.pickupPhotoUrl}
                alt="Abholung"
                className="w-full max-h-32 object-cover rounded mb-1"
                onClick={() => setLightbox({ photos: [{ url: borrow.pickupPhotoUrl!, label: "Abholung" }], currentIndex: 0 })}
              />
            )}
            {borrow.pickupComment && (
              <p className="text-muted-foreground italic">„{borrow.pickupComment}"</p>
            )}
          </div>
        )}

        {/* Return record */}
        {borrow.status === "completed" && (borrow.returnPhotoUrl || borrow.returnComment) && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
              {t("borrows:returnRecord", "Bei Rückgabe festgehalten")}
            </p>
            {borrow.returnPhotoUrl && (
              <ClickablePhoto
                src={borrow.returnPhotoUrl}
                alt="Rückgabe"
                className="w-full max-h-32 object-cover rounded mb-1"
                onClick={() => setLightbox({ photos: [{ url: borrow.returnPhotoUrl!, label: "Rückgabe" }], currentIndex: 0 })}
              />
            )}
            {borrow.returnComment && (
              <p className="text-muted-foreground italic">„{borrow.returnComment}"</p>
            )}
          </div>
        )}

        {/* Status-specific actions */}
        {borrow.status === "pending" && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t("borrows:waitingApproval", "Warte auf Genehmigung")}
            </p>
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <XCircle className="w-4 h-4 mr-1" />
                {t("borrows:cancelRequest", "Anfrage stornieren")}
              </Button>
            )}
          </div>
        )}
        {borrow.status === "approved" && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {t("borrows:approvedPickup", "Genehmigt – bitte abholen")}
            </p>
            <div className="flex gap-2">
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t("borrows:cancelRequest", "Stornieren")}
                </Button>
              )}
              {onPickup && (
                <Button
                  size="sm"
                  onClick={() => onPickup(borrow)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <PackageCheck className="w-4 h-4 mr-1" />
                  {t("borrows:confirmPickup", "Abholung bestätigen")}
                </Button>
              )}
            </div>
          </div>
        )}
        {borrow.status === "active" && onReturn && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("borrows:activeReturn", "Aktiv – bitte zurückgeben")}
            </p>
            <Button
              size="sm"
              onClick={() => onReturn(borrow)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Undo2 className="w-4 h-4 mr-1" />
              {t("borrows:confirmReturn", "Rückgabe bestätigen")}
            </Button>
          </div>
        )}
        {borrow.status === "rejected" && borrow.responseMessage && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("borrows:rejectedReason", "Abgelehnt")}: {borrow.responseMessage}
          </p>
        )}
        {borrow.status === "cancelled" && borrow.responseMessage && (
          <p className="text-sm text-muted-foreground">
            {borrow.responseMessage}
          </p>
        )}
      </CardContent>
    </Card>

    {/* Inline cancel confirmation dialog */}
    <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) setConfirmOpen(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {borrow.status === "pending"
              ? t("borrows:cancelDialog.titlePending", "Anfrage stornieren")
              : t("borrows:cancelDialog.titleApproved", "Genehmigte Ausleihe stornieren")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            {borrow.status === "pending"
              ? t("borrows:cancelDialog.confirmPending", `Möchtest du deine Anfrage für "${borrow.itemName}" wirklich stornieren?`)
              : t("borrows:cancelDialog.confirmApproved", `Möchtest du die genehmigte Ausleihe von "${borrow.itemName}" wirklich stornieren? Der Eigentümer wird benachrichtigt.`)}
          </p>
          {borrow.status === "approved" && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t("borrows:cancelDialog.approvedWarning", "Die Genehmigung wird zurückgezogen und der Gegenstand wieder als verfügbar markiert.")}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            {t("common:back", "Zurück")}
          </Button>
          <Button
            variant="destructive"
            disabled={isCancelling}
            onClick={() => {
              onCancel?.(borrow);
              setConfirmOpen(false);
            }}
          >
            <XCircle className="w-4 h-4 mr-1" />
            {isCancelling
              ? t("borrows:cancelDialog.cancelling", "Wird storniert...")
              : t("borrows:cancelDialog.confirm", "Ja, stornieren")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {lightbox && (
      <PhotoLightbox
        photos={lightbox.photos}
        currentIndex={lightbox.currentIndex}
        onClose={() => setLightbox(null)}
      />
    )}
    </>
  );
}

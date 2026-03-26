import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, PackageCheck, Undo2, ImageIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  rejected:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function BorrowCard({ borrow, onClose, onPickup, onReturn }: BorrowCardProps) {
  const { t } = useTranslation(["borrows", "common"]);

  return (
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
              <img src={borrow.pickupPhotoUrl} alt="Abholung" className="w-full max-h-32 object-cover rounded mb-1" />
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
              <img src={borrow.returnPhotoUrl} alt="Rückgabe" className="w-full max-h-32 object-cover rounded mb-1" />
            )}
            {borrow.returnComment && (
              <p className="text-muted-foreground italic">„{borrow.returnComment}"</p>
            )}
          </div>
        )}

        {/* Status-specific actions */}
        {borrow.status === "pending" && (
          <p className="text-sm text-muted-foreground">
            {t("borrows:waitingApproval", "Warte auf Genehmigung")}
          </p>
        )}
        {borrow.status === "approved" && onPickup && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {t("borrows:approvedPickup", "Genehmigt – bitte abholen")}
            </p>
            <Button
              size="sm"
              onClick={() => onPickup(borrow)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackageCheck className="w-4 h-4 mr-1" />
              {t("borrows:confirmPickup", "Abholung bestätigen")}
            </Button>
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
      </CardContent>
    </Card>
  );
}

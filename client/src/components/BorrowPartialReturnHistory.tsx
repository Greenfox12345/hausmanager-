/**
 * BorrowPartialReturnHistory.tsx
 *
 * Zeigt die Teilrückgabe-Einträge einer Ausleihe mit Notizen an.
 * Wird in der Borrows-Karte und im BorrowProtocol verwendet.
 */
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Clock, MessageSquare } from "lucide-react";

interface BorrowPartialReturnHistoryProps {
  requestId: number;
  loanQuantity: number;
}

export function BorrowPartialReturnHistory({ requestId, loanQuantity }: BorrowPartialReturnHistoryProps) {
  const { t } = useTranslation(["borrows"]);

  const { data: returnEntries = [] } = trpc.borrow.getReturnEntries.useQuery(
    { requestId },
    { enabled: loanQuantity > 0 }
  );

  if (!returnEntries.length) return null;

  return (
    <div className="mb-3 p-3 rounded-md border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-sm">
      <p className="font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        {t("borrows:partialReturns.title", "Teilrückgaben")}
      </p>
      <div className="space-y-2">
        {returnEntries.map((entry: any, idx: number) => (
          <div key={entry.id} className="border-l-2 border-amber-300 dark:border-amber-600 pl-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">
                {t("borrows:partialReturns.entry", {
                  index: idx + 1,
                  qty: entry.returnedQty,
                  defaultValue: `#${idx + 1}: ${entry.returnedQty} zurückgegeben`,
                })}
                {entry.memberName && (
                  <span className="text-muted-foreground font-normal"> – {entry.memberName}</span>
                )}
              </span>
              <span className="text-muted-foreground shrink-0">
                {new Date(entry.returnedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            {entry.note && (
              <p className="text-xs text-muted-foreground italic mt-0.5 flex items-start gap-1">
                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                <span>„{entry.note}"</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

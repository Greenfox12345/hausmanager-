import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any | null;
  onMarkReturned?: (borrowRequestId: number) => void;
}

export function EventDetailDialog({ open, onOpenChange, event, onMarkReturned }: EventDetailDialogProps) {
  const [, setLocation] = useLocation();

  if (!event) return null;

  const { relatedData } = event;
  const borrowRequest = relatedData?.borrowRequest;
  const item = relatedData?.item;

  const handleGoToItem = () => {
    if (item) {
      setLocation(`/inventory/${item.id}`);
      onOpenChange(false);
    }
  };

  const handleMarkReturned = () => {
    if (borrowRequest && onMarkReturned) {
      onMarkReturned(borrowRequest.id);
      onOpenChange(false);
    }
  };

  const canMarkReturned = 
    borrowRequest && 
    (borrowRequest.status === "approved" || borrowRequest.status === "active") &&
    event.eventType === "borrow_return" &&
    !event.isCompleted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{event.icon}</span>
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Type Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={
                event.eventType === "borrow_start"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : event.eventType === "borrow_return"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }
            >
              {event.eventType === "borrow_start" ? "Ausleihe-Start" : event.eventType === "borrow_return" ? "Rückgabe-Termin" : "Event"}
            </Badge>
            {event.isCompleted && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Erledigt
              </Badge>
            )}
          </div>

          {/* Event Date */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Datum</p>
            <p className="text-base">{format(new Date(event.startDate), "PPP", { locale: de })}</p>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Beschreibung</p>
              <p className="text-base">{event.description}</p>
            </div>
          )}

          {/* Related Item */}
          {item && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground mb-2">Verknüpftes Item</p>
              <div className="flex items-center gap-3">
                {item.photoUrl && (
                  <img 
                    src={item.photoUrl} 
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.category && (
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToItem}
                  className="shrink-0"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Zum Item
                </Button>
              </div>
            </div>
          )}

          {/* Borrow Request Status */}
          {borrowRequest && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1">
                {borrowRequest.status === "approved" ? "Genehmigt" : 
                 borrowRequest.status === "active" ? "Aktiv" :
                 borrowRequest.status === "completed" ? "Abgeschlossen" :
                 borrowRequest.status}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {canMarkReturned && (
              <Button
                onClick={handleMarkReturned}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Als zurückgegeben markieren
              </Button>
            )}
            {item && !canMarkReturned && (
              <Button
                onClick={handleGoToItem}
                variant="outline"
                className="flex-1"
              >
                <Package className="h-4 w-4 mr-2" />
                Item ansehen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

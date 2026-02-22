import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Availability Badge Component
function AvailabilityBadge({ itemId, occurrenceDate }: { itemId: number; occurrenceDate?: Date }) {
  const { data: availability } = trpc.inventoryAvailability.checkItemAvailability.useQuery(
    {
      inventoryItemId: itemId,
      startDate: occurrenceDate,
      endDate: occurrenceDate,
    },
    { enabled: !!occurrenceDate }
  );

  if (!occurrenceDate || !availability) {
    return (
      <Badge variant="outline" className="shrink-0">
        Verfügbar
      </Badge>
    );
  }

  switch (availability.status) {
    case "available":
      return (
        <Badge variant="outline" className="shrink-0 border-green-500 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verfügbar
        </Badge>
      );
    case "borrowed":
      return (
        <Badge variant="outline" className="shrink-0 border-red-500 text-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Ausgeliehen
        </Badge>
      );
    case "partially_available":
      return (
        <Badge variant="outline" className="shrink-0 border-yellow-500 text-yellow-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Eingeschränkt
        </Badge>
      );
    default:
      return null;
  }
}

interface ItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: number;
  onSelectItem: (itemId: number, itemName: string) => void;
  excludeItemIds?: number[]; // Items already added to this occurrence
  occurrenceDate?: Date; // Date of the occurrence to check availability
}

export function ItemPickerDialog({
  open,
  onOpenChange,
  householdId,
  onSelectItem,
  excludeItemIds = [],
  occurrenceDate,
}: ItemPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [conflictWarning, setConflictWarning] = useState<{
    itemId: number;
    itemName: string;
    conflicts: Array<{ id: number; startDate: Date; endDate: Date; status: string }>;
  } | null>(null);

  // Load inventory items
  const { data: items, isLoading } = trpc.inventory.list.useQuery(
    { householdId },
    { enabled: open }
  );

  // Filter items based on search query and exclusions
  const filteredItems = (items || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notExcluded = !excludeItemIds.includes(item.id);
    return matchesSearch && notExcluded;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gegenstand auswählen
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Gegenstand suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Lade Gegenstände...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="h-12 w-12 mb-2 opacity-50" />
              <p>Keine Gegenstände gefunden</p>
              {searchQuery && (
                <p className="text-sm">Versuche einen anderen Suchbegriff</p>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={async () => {
                  // Check availability if date is provided
                  if (occurrenceDate) {
                    const availabilityCheck = await trpc.inventoryAvailability.checkItemAvailability.query({
                      inventoryItemId: item.id,
                      startDate: occurrenceDate,
                      endDate: occurrenceDate,
                    });

                    // Show warning if item is borrowed or partially available
                    if (availabilityCheck.status !== "available" && availabilityCheck.conflictingBorrows.length > 0) {
                      setConflictWarning({
                        itemId: item.id,
                        itemName: item.name,
                        conflicts: availabilityCheck.conflictingBorrows,
                      });
                      return;
                    }
                  }

                  // No conflicts, proceed with selection
                  onSelectItem(item.id, item.name);
                  onOpenChange(false);
                  setSearchQuery("");
                }}
                className="w-full p-3 border rounded-lg hover:bg-accent transition-colors text-left flex items-start gap-3"
              >
                {/* Item Photo */}
                {item.photoUrls && item.photoUrls.length > 0 ? (
                  <img
                    src={typeof item.photoUrls[0] === 'string' ? item.photoUrls[0] : item.photoUrls[0].url}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  {item.details && (
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.details}
                    </div>
                  )}
                </div>

                {/* Availability Badge */}
                <AvailabilityBadge itemId={item.id} occurrenceDate={occurrenceDate} />
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSearchQuery("");
            }}
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Conflict Warning Dialog */}
      {conflictWarning && (
        <Dialog open={true} onOpenChange={() => setConflictWarning(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-5 w-5" />
                Gegenstand bereits ausgeliehen
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p>
                Der Gegenstand <strong>{conflictWarning.itemName}</strong> ist zum gewählten Termin bereits ausgeliehen:
              </p>

              <div className="space-y-2">
                {conflictWarning.conflicts.map((conflict) => (
                  <div key={conflict.id} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">Ausleihe #{conflict.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(conflict.startDate).toLocaleDateString("de-DE")} - {new Date(conflict.endDate).toLocaleDateString("de-DE")}
                    </div>
                    <div className="text-sm">
                      Status: <Badge variant="outline">{conflict.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Möchtest du den Gegenstand trotzdem hinzufügen? Du kannst später eine Ausleihe für einen anderen Zeitraum erstellen.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConflictWarning(null)}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onSelectItem(conflictWarning.itemId, conflictWarning.itemName);
                  setConflictWarning(null);
                  onOpenChange(false);
                  setSearchQuery("");
                }}
              >
                Trotzdem hinzufügen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

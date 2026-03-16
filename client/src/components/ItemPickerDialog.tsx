import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, CheckCircle2, XCircle, AlertCircle, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ConflictWarning = {
  itemId: number;
  itemName: string;
  conflicts: Array<{
    id: number;
    borrowerName: string;
    borrowerMemberId: number;
    startDate: Date;
    endDate: Date;
    status: string;
  }>;
};

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
  const [conflictWarning, setConflictWarning] = useState<ConflictWarning | null>(null);

  // tRPC utils for imperative queries
  const utils = trpc.useUtils();

  // Load own inventory items
  const { data: ownItems, isLoading: ownLoading } = trpc.inventory.list.useQuery(
    { householdId },
    { enabled: open }
  );

  // Load shared items from connected households
  const { data: allData, isLoading: sharedLoading } = trpc.inventory.listAll.useQuery(
    { householdId },
    { enabled: open }
  );

  const sharedItems = allData?.shared ?? [];
  const isLoading = ownLoading || sharedLoading;

  // Group shared items by household
  const sharedByHousehold = sharedItems.reduce<Record<string, { householdName: string; items: typeof sharedItems }>>((acc, item) => {
    const key = String(item.householdId);
    if (!acc[key]) {
      acc[key] = { householdName: (item as any).householdName ?? `Haushalt #${item.householdId}`, items: [] };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  // Filter own items
  const filteredOwn = (ownItems || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notExcluded = !excludeItemIds.includes(item.id);
    return matchesSearch && notExcluded;
  });

  // Filter shared items
  const filteredSharedByHousehold = Object.entries(sharedByHousehold).reduce<typeof sharedByHousehold>((acc, [key, group]) => {
    const filtered = group.items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notExcluded = !excludeItemIds.includes(item.id);
      return matchesSearch && notExcluded;
    });
    if (filtered.length > 0) {
      acc[key] = { ...group, items: filtered };
    }
    return acc;
  }, {});

  const hasShared = Object.keys(filteredSharedByHousehold).length > 0;

  const handleItemClick = async (item: { id: number; name: string }) => {
    if (occurrenceDate) {
      const availabilityCheck = await utils.inventoryAvailability.checkItemAvailability.fetch({
        inventoryItemId: item.id,
        startDate: occurrenceDate,
        endDate: occurrenceDate,
      });

      if (availabilityCheck.status !== "available" && availabilityCheck.conflictingBorrows.length > 0) {
        setConflictWarning({
          itemId: item.id,
          itemName: item.name,
          conflicts: availabilityCheck.conflictingBorrows,
        });
        return;
      }
    }
    onSelectItem(item.id, item.name);
    onOpenChange(false);
    setSearchQuery("");
  };

  const renderItem = (item: { id: number; name: string; details?: string | null; photoUrls?: any }, isExternal = false) => (
    <button
      key={item.id}
      onClick={() => handleItemClick(item)}
      className={`w-full p-3 border rounded-lg hover:bg-accent transition-colors text-left flex items-start gap-3 ${isExternal ? 'border-amber-300 dark:border-amber-700' : ''}`}
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
  );

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
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Lade Gegenstände...
            </div>
          ) : filteredOwn.length === 0 && !hasShared ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="h-12 w-12 mb-2 opacity-50" />
              <p>Keine Gegenstände gefunden</p>
              {searchQuery && (
                <p className="text-sm">Versuche einen anderen Suchbegriff</p>
              )}
            </div>
          ) : (
            <>
              {/* Own household items */}
              {filteredOwn.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    Dieser Haushalt
                  </div>
                  <div className="space-y-2">
                    {filteredOwn.map((item) => renderItem(item, false))}
                  </div>
                </div>
              )}

              {/* Shared items grouped by household */}
              {hasShared && Object.entries(filteredSharedByHousehold).map(([key, group]) => (
                <div key={key}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2 px-1">
                    <Globe className="h-3.5 w-3.5" />
                    {group.householdName}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => renderItem(item, true))}
                  </div>
                </div>
              ))}
            </>
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
                {conflictWarning.conflicts.map((conflict, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{conflict.borrowerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(conflict.startDate).toLocaleDateString("de-DE")} - {new Date(conflict.endDate).toLocaleDateString("de-DE")}
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

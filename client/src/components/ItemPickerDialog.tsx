import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: number;
  onSelectItem: (itemId: number, itemName: string) => void;
  excludeItemIds?: number[]; // Items already added to this occurrence
}

export function ItemPickerDialog({
  open,
  onOpenChange,
  householdId,
  onSelectItem,
  excludeItemIds = [],
}: ItemPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Load inventory items
  const { data: items, isLoading } = trpc.inventory.getItems.useQuery(
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
                onClick={() => {
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

                {/* Availability Badge (placeholder for future) */}
                <Badge variant="outline" className="shrink-0">
                  Verfügbar
                </Badge>
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
    </Dialog>
  );
}

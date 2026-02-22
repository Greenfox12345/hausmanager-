import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ItemPickerDialog } from "./ItemPickerDialog";
import { BorrowRequestDialog } from "./BorrowRequestDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface RequiredItemsSectionProps {
  taskId: number;
  householdId: number;
  taskName: string;
  members?: Array<{ id: number; name: string }>;
  rotationSchedule: Array<{
    occurrenceNumber: number;
    date?: Date;
    specialDate?: Date;
    assignedMemberIds?: number[];
    items?: Array<{
      itemId: number;
      itemName: string;
    }>;
  }>;
  onItemAdded: () => void;
}

export function RequiredItemsSection({
  taskId,
  householdId,
  taskName,
  members = [],
  rotationSchedule,
  onItemAdded,
}: RequiredItemsSectionProps) {
  const [selectedOccurrence, setSelectedOccurrence] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    inventoryItemId: number;
    itemName: string;
    occurrenceNumber: number;
    borrowStartDate?: string | null;
    borrowEndDate?: string | null;
  } | null>(null);

  // Load occurrence items with borrow details
  const { data: occurrenceItems = [] } = trpc.taskOccurrenceItems.getTaskOccurrenceItems.useQuery({
    taskId,
  });

  // Mutations
  const addItemMutation = trpc.taskOccurrenceItems.addItemToOccurrence.useMutation();
  const removeItemMutation = trpc.taskOccurrenceItems.removeItemFromOccurrence.useMutation();
  const updateBorrowMutation = trpc.taskOccurrenceItems.updateOccurrenceItemBorrow.useMutation();
  const createBorrowRequestMutation = trpc.borrow.request.useMutation();

  // Get current user
  const { data: currentUser } = trpc.auth.me.useQuery();

  const utils = trpc.useUtils();

  // Handle adding item to occurrence
  const handleAddItem = async (itemId: number, itemName: string) => {
    if (selectedOccurrence === null) return;

    try {
      await addItemMutation.mutateAsync({
        taskId,
        occurrenceNumber: selectedOccurrence,
        inventoryItemId: itemId,
      });
      await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
      onItemAdded();
      setIsPickerOpen(false);
      toast.success(`"${itemName}" zu Termin ${selectedOccurrence} hinzugefügt`);
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Fehler beim Hinzufügen des Gegenstands");
    }
  };

  // Handle removing item
  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItemMutation.mutateAsync({ itemId });
      await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
      onItemAdded();
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  // Get items for a specific occurrence
  const getItemsForOccurrence = (occurrenceNumber: number) => {
    return occurrenceItems.filter((item) => item.occurrenceNumber === occurrenceNumber);
  };

  // Calculate maximum number of rows needed
  const maxRows = Math.max(
    ...rotationSchedule.map((occ) => getItemsForOccurrence(occ.occurrenceNumber).length + 1),
    1
  );

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    if (!status || status === "not_requested") {
      return <Badge variant="secondary">Nicht angefragt</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="outline">Angefragt</Badge>;
    }
    if (status === "approved") {
      return <Badge variant="default" className="bg-green-600">Genehmigt</Badge>;
    }
    if (status === "borrowed") {
      return <Badge variant="default" className="bg-blue-600">Ausgeliehen</Badge>;
    }
    if (status === "returned") {
      return <Badge variant="default" className="bg-gray-600">Zurückgegeben</Badge>;
    }
    return null;
  };

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd.MM.yyyy", { locale: de });
  };

  return (
    <Card className="p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Benötigte Gegenstände</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {rotationSchedule.map((occ) => (
                <th key={occ.occurrenceNumber} className="border p-2 text-left bg-muted">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div className="font-semibold">Termin {occ.occurrenceNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(occ.specialDate || occ.date || null)}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {rotationSchedule.map((occ) => {
                  const items = getItemsForOccurrence(occ.occurrenceNumber);
                  const item = items[rowIndex];

                  // If this is the "+ Gegenstand" button row
                  if (rowIndex === items.length) {
                    return (
                      <td key={occ.occurrenceNumber} className="border p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOccurrence(occ.occurrenceNumber);
                            setIsPickerOpen(true);
                          }}
                          className="w-full"
                        >
                          + Gegenstand
                        </Button>
                      </td>
                    );
                  }

                  // If there's an item in this row
                  if (item) {
                    return (
                      <td key={occ.occurrenceNumber} className="border p-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.itemName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              ×
                            </Button>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(item.borrowStartDate)} - {formatDate(item.borrowEndDate)}
                                <Edit2 className="h-3 w-3 ml-auto" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Ausleih-Start</label>
                                  <Input
                                    type="date"
                                    value={item.borrowStartDate ? format(new Date(item.borrowStartDate), "yyyy-MM-dd") : ""}
                                    onChange={async (e) => {
                                      const newDate = e.target.value ? new Date(e.target.value) : null;
                                      try {
                                        await updateBorrowMutation.mutateAsync({
                                          itemId: item.id,
                                          borrowStartDate: newDate ? newDate.toISOString() : null,
                                        });
                                        await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
                                        toast.success("Ausleih-Start aktualisiert");
                                      } catch (error) {
                                        toast.error("Fehler beim Speichern");
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Ausleih-Ende</label>
                                  <Input
                                    type="date"
                                    value={item.borrowEndDate ? format(new Date(item.borrowEndDate), "yyyy-MM-dd") : ""}
                                    onChange={async (e) => {
                                      const newDate = e.target.value ? new Date(e.target.value) : null;
                                      try {
                                        await updateBorrowMutation.mutateAsync({
                                          itemId: item.id,
                                          borrowEndDate: newDate ? newDate.toISOString() : null,
                                        });
                                        await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
                                        toast.success("Ausleih-Ende aktualisiert");
                                      } catch (error) {
                                        toast.error("Fehler beim Speichern");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <div>{getStatusBadge(item.borrowStatus)}</div>
                          {(!item.borrowStatus || item.borrowStatus === "not_requested") && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                if (!currentUser) {
                                  toast.error("Bitte anmelden");
                                  return;
                                }
                                setSelectedItem({
                                  id: item.id,
                                  inventoryItemId: item.inventoryItemId,
                                  itemName: item.itemName,
                                  occurrenceNumber: item.occurrenceNumber,
                                  borrowStartDate: item.borrowStartDate,
                                  borrowEndDate: item.borrowEndDate,
                                });
                                setBorrowDialogOpen(true);
                              }}
                              disabled={createBorrowRequestMutation.isPending}
                            >
                              {createBorrowRequestMutation.isPending ? "Wird erstellt..." : "Ausleihe anfragen"}
                            </Button>
                          )}
                        </div>
                      </td>
                    );
                  }

                  // Empty cell (no border)
                  return <td key={occ.occurrenceNumber} className="p-2"></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ItemPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        householdId={householdId}
        onSelectItem={handleAddItem}
        excludeItemIds={selectedOccurrence !== null ? getItemsForOccurrence(selectedOccurrence).map(item => item.inventoryItemId) : []}
        occurrenceDate={
          selectedOccurrence !== null
            ? rotationSchedule.find((o) => o.occurrenceNumber === selectedOccurrence)?.specialDate ||
              rotationSchedule.find((o) => o.occurrenceNumber === selectedOccurrence)?.date ||
              undefined
            : undefined
        }
      />

      <BorrowRequestDialog
        open={borrowDialogOpen}
        onOpenChange={setBorrowDialogOpen}
        itemName={selectedItem?.itemName || ""}
        itemId={selectedItem?.inventoryItemId || 0}
        taskName={taskName}
        occurrenceNumber={selectedItem?.occurrenceNumber}
        occurrenceDate={
          selectedItem?.occurrenceNumber
            ? rotationSchedule.find((o) => o.occurrenceNumber === selectedItem.occurrenceNumber)?.specialDate ||
              rotationSchedule.find((o) => o.occurrenceNumber === selectedItem.occurrenceNumber)?.date
            : undefined
        }
        assignedMembers={
          selectedItem?.occurrenceNumber
            ? rotationSchedule
                .find((o) => o.occurrenceNumber === selectedItem.occurrenceNumber)
                ?.assignedMemberIds?.map((memberId) => members.find((m) => m.id === memberId)?.name)
                .filter((name): name is string => !!name) || []
            : []
        }
        initialStartDate={selectedItem?.borrowStartDate}
        initialEndDate={selectedItem?.borrowEndDate}
        onSubmit={async (data) => {
          if (!selectedItem || !currentUser) return;

          try {
            const result = await createBorrowRequestMutation.mutateAsync({
              inventoryItemId: selectedItem.inventoryItemId,
              borrowerHouseholdId: householdId,
              borrowerMemberId: currentUser.id,
              startDate: data.startDate.toISOString(),
              endDate: data.endDate.toISOString(),
              requestMessage: data.message || `Für Aufgabe #${taskId}, Termin ${selectedItem.occurrenceNumber}`,
            });
            
            // Update item with borrow request ID and status
            await updateBorrowMutation.mutateAsync({
              itemId: selectedItem.id,
              borrowRequestId: result.requestId,
              borrowStatus: result.autoApproved ? "approved" : "pending",
            });
            
            await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
            
            if (result.autoApproved) {
              toast.success("✅ Ausleihe automatisch genehmigt", {
                description: "Dieser Gegenstand gehört zu deinem Haushalt"
              });
            } else {
              toast.success("📤 Ausleih-Anfrage gesendet", {
                description: "Warte auf Bestätigung des Eigentümers"
              });
            }
            
            setBorrowDialogOpen(false);
            setSelectedItem(null);
          } catch (error) {
            console.error("Failed to create borrow request:", error);
            toast.error("Fehler beim Erstellen der Ausleih-Anfrage");
          }
        }}
        isSubmitting={createBorrowRequestMutation.isPending}
      />
    </Card>
  );
}

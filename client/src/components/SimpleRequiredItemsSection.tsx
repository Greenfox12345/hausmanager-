import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, X } from "lucide-react";
import { ItemPickerDialog } from "./ItemPickerDialog";
import { BorrowRequestDialog } from "./BorrowRequestDialog";
import { RevokeApprovalDialog } from "./RevokeApprovalDialog";
import { toast } from "sonner";

// occurrenceNumber=0 is used as a sentinel for "no specific occurrence" (non-repeating tasks)
const SINGLE_OCCURRENCE = 0;

interface SimpleRequiredItemsSectionProps {
  taskId: number;
  householdId: number;
  taskName: string;
}

export function SimpleRequiredItemsSection({
  taskId,
  householdId,
  taskName,
}: SimpleRequiredItemsSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeItemInfo, setRevokeItemInfo] = useState<{
    borrowRequestId: number;
    itemName: string;
    borrowerName: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    inventoryItemId: number;
    itemName: string;
  } | null>(null);

  const utils = trpc.useUtils();

  // Load occurrence items (filtered to occurrenceNumber=0)
  const { data: allOccurrenceItems = [] } = trpc.taskOccurrenceItems.getTaskOccurrenceItems.useQuery({
    taskId,
  });

  // Filter to only items for occurrence 0 (non-repeating)
  const items = allOccurrenceItems.filter((item) => item.occurrenceNumber === SINGLE_OCCURRENCE);

  // Mutations
  const addItemMutation = trpc.taskOccurrenceItems.addItemToOccurrence.useMutation();
  const removeItemMutation = trpc.taskOccurrenceItems.removeItemFromOccurrence.useMutation();
  const updateBorrowMutation = trpc.taskOccurrenceItems.updateOccurrenceItemBorrow.useMutation();
  const createBorrowRequestMutation = trpc.borrow.request.useMutation();
  const revokeMutation = trpc.borrow.revoke.useMutation({
    onSuccess: () => {
      toast.success("Genehmigung widerrufen");
      utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
      setShowRevokeDialog(false);
      setRevokeItemInfo(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Fehler beim Widerrufen");
    },
  });

  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: currentMember } = trpc.householdManagement.getCurrentMember.useQuery(
    { householdId },
    { enabled: !!currentUser }
  );

  const handleAddItem = async (itemId: number, itemName: string) => {
    try {
      await addItemMutation.mutateAsync({
        taskId,
        occurrenceNumber: SINGLE_OCCURRENCE,
        inventoryItemId: itemId,
      });
      await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
      setIsPickerOpen(false);
      toast.success(`"${itemName}" hinzugefügt`);
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Fehler beim Hinzufügen des Gegenstands");
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItemMutation.mutateAsync({ itemId });
      await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });
      toast.success("Gegenstand entfernt");
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error("Fehler beim Entfernen");
    }
  };

  const getStatusBadge = (requestStatus: string | null) => {
    if (!requestStatus) return <Badge variant="secondary">Nicht angefragt</Badge>;
    if (requestStatus === "pending") return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Angefragt</Badge>;
    if (requestStatus === "approved") return <Badge variant="default" className="bg-green-600">Genehmigt</Badge>;
    if (requestStatus === "active") return <Badge variant="default" className="bg-blue-600">Ausgeliehen</Badge>;
    if (requestStatus === "completed") return <Badge variant="default" className="bg-gray-600">Zurückgegeben</Badge>;
    if (requestStatus === "rejected") return <Badge variant="destructive">Abgelehnt</Badge>;
    if (requestStatus === "cancelled") return <Badge variant="secondary">Storniert</Badge>;
    return null;
  };

  return (
    <Card className="p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Benötigte Gegenstände</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="border p-2 text-left bg-muted">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="font-semibold">Gegenstand</span>
                </div>
              </th>
              <th className="border p-2 text-left bg-muted w-40">
                <span className="font-semibold">Status</span>
              </th>
              <th className="border p-2 text-left bg-muted w-24">
                <span className="font-semibold">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">
                  <span className="font-medium">{item.itemName}</span>
                </td>
                <td className="border p-2">
                  <div className="space-y-1">
                    {getStatusBadge(item.requestStatus)}
                  </div>
                </td>
                <td className="border p-2">
                  <div className="flex items-center gap-1">
                    {(!item.requestStatus || item.requestStatus === "rejected" || item.requestStatus === "cancelled") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!currentUser || !currentMember) {
                            toast.error("Bitte anmelden");
                            return;
                          }
                          setSelectedItem({
                            id: item.id,
                            inventoryItemId: item.inventoryItemId,
                            itemName: item.itemName || "Unbekannt",
                          });
                          setBorrowDialogOpen(true);
                        }}
                        disabled={createBorrowRequestMutation.isPending}
                        className="text-xs"
                      >
                        Ausleihen
                      </Button>
                    )}
                    {(item.requestStatus === "approved" || item.requestStatus === "active") && item.borrowRequestId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRevokeItemInfo({
                            borrowRequestId: item.borrowRequestId!,
                            itemName: item.itemName || "Unbekannt",
                            borrowerName: currentMember?.memberName || "Unbekannt",
                            startDate: item.borrowStartDate ? new Date(item.borrowStartDate).toLocaleDateString("de-DE") : "-",
                            endDate: item.borrowEndDate ? new Date(item.borrowEndDate).toLocaleDateString("de-DE") : "-",
                          });
                          setShowRevokeDialog(true);
                        }}
                        className="text-xs"
                      >
                        Widerrufen
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full"
                >
                  + Gegenstand hinzufügen
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ItemPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        householdId={householdId}
        onSelectItem={handleAddItem}
        excludeItemIds={items.map((item) => item.inventoryItemId)}
      />

      <BorrowRequestDialog
        open={borrowDialogOpen}
        onOpenChange={setBorrowDialogOpen}
        itemName={selectedItem?.itemName || ""}
        itemId={selectedItem?.inventoryItemId || 0}
        taskName={taskName}
        occurrenceNumber={undefined}
        occurrenceDate={undefined}
        assignedMembers={[]}
        initialStartDate={undefined}
        initialEndDate={undefined}
        onSubmit={async (data) => {
          if (!selectedItem || !currentUser || !currentMember) return;

          try {
            const result = await createBorrowRequestMutation.mutateAsync({
              inventoryItemId: selectedItem.inventoryItemId,
              borrowerHouseholdId: householdId,
              borrowerMemberId: currentMember.id,
              startDate: data.startDate.toISOString(),
              endDate: data.endDate.toISOString(),
              requestMessage: data.message || `Für Aufgabe "${taskName}"`,
              taskId,
              taskName,
              occurrenceNumber: SINGLE_OCCURRENCE,
            });

            await updateBorrowMutation.mutateAsync({
              itemId: selectedItem.id,
              borrowRequestId: result.requestId,
              borrowStatus: "pending",
              borrowStartDate: data.startDate.toISOString(),
              borrowEndDate: data.endDate.toISOString(),
            });

            await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId });

            if (result.autoApproved) {
              toast.success("✅ Ausleihe automatisch genehmigt", {
                description: "Dieser Gegenstand gehört zu deinem Haushalt",
              });
            } else {
              toast.success("📤 Ausleih-Anfrage gesendet", {
                description: "Warte auf Bestätigung des Eigentümers",
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

      {revokeItemInfo && (
        <RevokeApprovalDialog
          open={showRevokeDialog}
          onOpenChange={(open) => {
            setShowRevokeDialog(open);
            if (!open) setRevokeItemInfo(null);
          }}
          itemName={revokeItemInfo.itemName}
          borrowerName={revokeItemInfo.borrowerName}
          startDate={revokeItemInfo.startDate}
          endDate={revokeItemInfo.endDate}
          taskId={taskId}
          taskName={taskName}
          occurrenceNumber={undefined}
          onConfirm={(reason) => {
            if (!currentMember) return;
            revokeMutation.mutate({
              requestId: revokeItemInfo.borrowRequestId,
              revokerId: currentMember.id,
              revokerHouseholdId: householdId,
              reason,
            });
          }}
          isSubmitting={revokeMutation.isPending}
        />
      )}
    </Card>
  );
}

import { useState } from "react";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, UserPlus, Check, X, Trash2, Bell, Package, Globe, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { BorrowRequestDialog } from "@/components/BorrowRequestDialog";

type ActiveTab = "connect" | "borrow";

export default function Neighborhood() {
  const { household, member } = useCompatAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("connect");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const { t } = useTranslation(["neighborhood", "common"]);

  // Borrow state
  const [selectedItemForBorrow, setSelectedItemForBorrow] = useState<{ id: number; name: string; householdName: string } | null>(null);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [filterHouseholdId, setFilterHouseholdId] = useState<string>("all");

  // Queries
  const { data: connectedHouseholds = [], isLoading: loadingConnected } = trpc.neighborhood.getConnectedHouseholds.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: pendingInvitations = [], isLoading: loadingInvitations } = trpc.neighborhood.getPendingInvitations.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: searchResults = [] } = trpc.neighborhood.searchHouseholds.useQuery(
    { query: searchQuery, currentHouseholdId: household?.householdId ?? 0 },
    { enabled: !!household && searchQuery.length > 0 }
  );

  // Load shared inventory items from connected households
  const { data: allInventory, isLoading: loadingInventory } = trpc.inventory.listAll.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && activeTab === "borrow" }
  );

  const sharedItems = allInventory?.shared ?? [];

  // Group shared items by household
  const sharedByHousehold = sharedItems.reduce<Record<string, { householdName: string; householdId: number; items: typeof sharedItems }>>((acc, item) => {
    const key = String(item.householdId);
    if (!acc[key]) {
      acc[key] = {
        householdName: (item as any).householdName ?? `Haushalt #${item.householdId}`,
        householdId: item.householdId,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  // Filter by selected household
  const filteredGroups = filterHouseholdId === "all"
    ? Object.values(sharedByHousehold)
    : Object.values(sharedByHousehold).filter(g => String(g.householdId) === filterHouseholdId);

  // Mutations
  const sendInvitationMutation = trpc.neighborhood.sendInvitation.useMutation({
    onSuccess: () => {
      toast.success(t("neighborhood:messages.invitationSent", "Einladung gesendet!"));
      setSearchQuery("");
      setInviteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const acceptInvitationMutation = trpc.neighborhood.acceptInvitation.useMutation({
    onSuccess: () => {
      utils.neighborhood.getPendingInvitations.invalidate();
      utils.neighborhood.getConnectedHouseholds.invalidate();
      toast.success(t("neighborhood:messages.invitationAccepted", "Einladung angenommen!"));
    },
  });

  const rejectInvitationMutation = trpc.neighborhood.rejectInvitation.useMutation({
    onSuccess: () => {
      utils.neighborhood.getPendingInvitations.invalidate();
      toast.success(t("neighborhood:messages.invitationRejected", "Einladung abgelehnt"));
    },
  });

  const removeConnectionMutation = trpc.neighborhood.removeConnection.useMutation({
    onSuccess: () => {
      utils.neighborhood.getConnectedHouseholds.invalidate();
      toast.success(t("neighborhood:messages.connectionRemoved", "Verbindung entfernt"));
    },
  });

  const borrowRequestMutation = trpc.borrow.request.useMutation({
    onSuccess: (data) => {
      setBorrowDialogOpen(false);
      setSelectedItemForBorrow(null);
      if (data.autoApproved) {
        toast.success(t("neighborhood:messages.borrowAutoApproved", "Ausleih-Anfrage automatisch genehmigt"));
      } else {
        toast.success(t("neighborhood:messages.borrowRequestSent", "Ausleih-Anfrage gesendet. Warte auf Genehmigung."));
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSendInvitation = (targetHouseholdId: number) => {
    if (!household || !member) return;
    sendInvitationMutation.mutate({
      targetHouseholdId,
      householdId: household.householdId,
      memberId: member.memberId,
    });
  };

  const handleAcceptInvitation = (connectionId: number) => {
    acceptInvitationMutation.mutate({ connectionId });
  };

  const handleRejectInvitation = (connectionId: number) => {
    rejectInvitationMutation.mutate({ connectionId });
  };

  const handleRemoveConnection = (targetHouseholdId: number) => {
    if (!household) return;
    if (confirm(t("neighborhood:messages.confirmRemoveConnection", "Möchten Sie diese Verbindung wirklich entfernen?"))) {
      removeConnectionMutation.mutate({
        householdId: household.householdId,
        targetHouseholdId,
      });
    }
  };

  const handleBorrowRequest = (data: { startDate: Date; endDate: Date; message?: string }) => {
    if (!household || !member || !selectedItemForBorrow) return;
    borrowRequestMutation.mutate({
      inventoryItemId: selectedItemForBorrow.id,
      borrowerHouseholdId: household.householdId,
      borrowerMemberId: member.memberId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      requestMessage: data.message,
    });
  };

  const getCategoryStyle = (color?: string) => ({
    backgroundColor: (color ?? '#3b82f6') + '20',
    borderColor: color ?? '#3b82f6',
    color: color ?? '#3b82f6',
  });

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              {t("neighborhood:title", "Nachbarschaft")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("neighborhood:description", "Vernetzen Sie sich mit anderen Haushalten für gemeinsame Aufgaben und Projekte")}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("connect")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "connect"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            {t("neighborhood:tabs.connect", "Haushalte verbinden")}
          </button>
          <button
            onClick={() => setActiveTab("borrow")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "borrow"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            {t("neighborhood:tabs.borrow", "Gegenstände ausleihen")}
            {sharedItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sharedItems.length}</Badge>
            )}
          </button>
        </div>

        {/* ===== TAB: HAUSHALTE VERBINDEN ===== */}
        {activeTab === "connect" && (
          <>
            {/* Invite Button */}
            <div className="flex justify-end">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("neighborhood:actions.inviteHousehold", "Haushalt einladen")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("neighborhood:actions.inviteHousehold", "Haushalt einladen")}</DialogTitle>
                    <DialogDescription>
                      {t("neighborhood:messages.enterInviteCodeDescription", "Geben Sie den Einladungscode des Haushalts ein, den Sie verbinden möchten")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="search">{t("neighborhood:fields.inviteCode", "Einladungscode eingeben")}</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="search"
                          placeholder={t("neighborhood:fields.inviteCodePlaceholder", "z.B. ABC123")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <Label>{t("neighborhood:messages.householdFound", "Haushalt gefunden")}</Label>
                        {searchResults.map((result) => (
                          <Card key={result.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{result.name}</p>
                                <p className="text-sm text-muted-foreground">{t("neighborhood:fields.code", "Code:")} {result.inviteCode}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSendInvitation(result.id)}
                                disabled={sendInvitationMutation.isPending}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                {t("neighborhood:actions.invite", "Einladen")}
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {searchQuery.length > 0 && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("neighborhood:messages.noHouseholdFound", "Kein Haushalt mit diesem Einladungscode gefunden")}
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {t("neighborhood:messages.pendingInvitations", "Ausstehende Einladungen")}
                    <Badge variant="secondary">{pendingInvitations.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {t("neighborhood:messages.invitationsFromOtherHouseholds", "Einladungen von anderen Haushalten")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <Card key={invitation.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{invitation.requestingHouseholdName}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("neighborhood:messages.invitedBy", "Eingeladen von")} {invitation.requesterName} · {" "}
                            {invitation.createdAt && format(new Date(invitation.createdAt), "PPP", { locale: de })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={acceptInvitationMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t("neighborhood:actions.accept", "Annehmen")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectInvitation(invitation.id)}
                            disabled={rejectInvitationMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t("neighborhood:actions.reject", "Ablehnen")}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Connected Households */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("neighborhood:messages.connectedHouseholds", "Verbundene Haushalte")}
                  <Badge variant="secondary">{connectedHouseholds.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {t("neighborhood:messages.householdsToShareTasks", "Haushalte, mit denen Sie Aufgaben und Projekte teilen können")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConnected ? (
                  <p className="text-muted-foreground text-center py-8">{t("common:status.loading", "Lade...")}</p>
                ) : connectedHouseholds.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("neighborhood:messages.noConnectedHouseholds", "Noch keine verbundenen Haushalte")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("neighborhood:messages.inviteOthersToPlanTasks", "Laden Sie andere Haushalte ein, um gemeinsam Aufgaben zu planen")}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {connectedHouseholds.map((connectedHousehold) => (
                      <Card key={connectedHousehold.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-lg">{connectedHousehold.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {t("neighborhood:messages.connectedSince", "Verbunden seit")} {format(new Date(connectedHousehold.createdAt), "PPP", { locale: de })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveConnection(connectedHousehold.id)}
                            disabled={removeConnectionMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("neighborhood:actions.remove", "Entfernen")}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">{t("neighborhood:messages.howItWorks", "So funktioniert's")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>1. {t("neighborhood:messages.connectHouseholdsTitle", "Haushalte verbinden:")}</strong> {t("neighborhood:messages.connectHouseholdsDescription", "Geben Sie den Einladungscode eines anderen Haushalts ein, um eine Verbindung herzustellen")}
                </p>
                <p>
                  <strong>2. {t("neighborhood:messages.shareTasksTitle", "Aufgaben teilen:")}</strong> {t("neighborhood:messages.shareTasksDescription", "Beim Erstellen von Aufgaben können Sie verbundene Haushalte auswählen")}
                </p>
                <p>
                  <strong>3. {t("neighborhood:messages.assignMembersTitle", "Mitglieder zuweisen:")}</strong> {t("neighborhood:messages.assignMembersDescription", "Weisen Sie Aufgaben Mitgliedern aus allen verbundenen Haushalten zu")}
                </p>
                <p>
                  <strong>4. {t("neighborhood:messages.manageTogetherTitle", "Gemeinsam verwalten:")}</strong> {t("neighborhood:messages.manageTogetherDescription", "Alle Mitglieder verbundener Haushalte können geteilte Aufgaben bearbeiten")}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== TAB: GEGENSTÄNDE AUSLEIHEN ===== */}
        {activeTab === "borrow" && (
          <>
            {/* Filter by household */}
            {Object.keys(sharedByHousehold).length > 1 && (
              <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm text-muted-foreground">{t("neighborhood:fields.household", "Haushalt")}:</Label>
                <Select value={filterHouseholdId} onValueChange={setFilterHouseholdId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("neighborhood:fields.allHouseholds", "Alle Haushalte")}</SelectItem>
                    {Object.values(sharedByHousehold).map((g) => (
                      <SelectItem key={g.householdId} value={String(g.householdId)}>
                        {g.householdName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loadingInventory ? (
              <div className="text-center py-12 text-muted-foreground">{t("neighborhood:messages.loadingItems", "Lade Gegenstände...")}</div>
            ) : sharedItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">{t("neighborhood:messages.noItemsAvailable", "Keine Gegenstände verfügbar")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("neighborhood:messages.noItemsHint", "Verbundene Haushalte müssen ihre Gegenstände erst für andere freigeben.")}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("connect")}>
                  <Users className="h-4 w-4 mr-2" />
                  {t("neighborhood:tabs.connect", "Haushalte verbinden")}
                </Button>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("neighborhood:messages.noItemsForHousehold", "Keine Gegenstände für diesen Haushalt gefunden.")}
              </div>
            ) : (
              <div className="space-y-8">
                {filteredGroups.map((group) => (
                  <div key={group.householdId}>
                    {/* Household header */}
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h2 className="text-base font-semibold text-amber-700 dark:text-amber-400">
                        {group.householdName}
                      </h2>
                      <Badge variant="outline" className="text-xs">
                        {group.items.length} {group.items.length === 1 ? t("neighborhood:fields.item", "Gegenstand") : t("neighborhood:fields.items", "Gegenstände")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          {/* Photo */}
                          {item.photoUrls && item.photoUrls.length > 0 ? (
                            <div className="h-40 overflow-hidden">
                              <img
                                src={typeof item.photoUrls[0] === 'string' ? item.photoUrls[0] : (item.photoUrls[0] as any).url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-40 bg-muted flex items-center justify-center">
                              <Package className="h-12 w-12 text-muted-foreground opacity-40" />
                            </div>
                          )}

                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.categoryName && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs border shrink-0"
                                  style={getCategoryStyle(item.categoryColor ?? undefined)}
                                >
                                  {item.categoryName}
                                </span>
                              )}
                            </div>
                            {item.details && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.details}</p>
                            )}
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedItemForBorrow({
                                  id: item.id,
                                  name: item.name,
                                  householdName: group.householdName,
                                });
                                setBorrowDialogOpen(true);
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              {t("neighborhood:actions.requestBorrow", "Ausleihen anfragen")}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Borrow Request Dialog */}
      {selectedItemForBorrow && (
        <BorrowRequestDialog
          open={borrowDialogOpen}
          onOpenChange={(open) => {
            setBorrowDialogOpen(open);
            if (!open) setSelectedItemForBorrow(null);
          }}
          itemName={selectedItemForBorrow.name}
          itemId={selectedItemForBorrow.id}
          onSubmit={handleBorrowRequest}
          isSubmitting={borrowRequestMutation.isPending}
        />
      )}
    </AppLayout>
  );
}

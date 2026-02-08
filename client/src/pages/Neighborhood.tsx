import { useState } from "react";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, UserPlus, Search, Check, X, Trash2, Bell } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Neighborhood() {
  const { household, member } = useCompatAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const utils = trpc.useUtils();

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

  // Mutations
  const sendInvitationMutation = trpc.neighborhood.sendInvitation.useMutation({
    onSuccess: () => {
      toast.success("Einladung gesendet!");
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
      toast.success("Einladung angenommen!");
    },
  });

  const rejectInvitationMutation = trpc.neighborhood.rejectInvitation.useMutation({
    onSuccess: () => {
      utils.neighborhood.getPendingInvitations.invalidate();
      toast.success("Einladung abgelehnt");
    },
  });

  const removeConnectionMutation = trpc.neighborhood.removeConnection.useMutation({
    onSuccess: () => {
      utils.neighborhood.getConnectedHouseholds.invalidate();
      toast.success("Verbindung entfernt");
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
    if (confirm("Möchten Sie diese Verbindung wirklich entfernen?")) {
      removeConnectionMutation.mutate({
        householdId: household.householdId,
        targetHouseholdId,
      });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Nachbarschaft
            </h1>
            <p className="text-muted-foreground mt-1">
              Vernetzen Sie sich mit anderen Haushalten für gemeinsame Aufgaben und Projekte
            </p>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Haushalt einladen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Haushalt einladen</DialogTitle>
                <DialogDescription>
                  Suchen Sie nach einem Haushalt über den Namen oder Einladungscode
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Haushalt suchen</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Name oder Einladungscode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Suchergebnisse</Label>
                    {searchResults.map((result) => (
                      <Card key={result.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-muted-foreground">Code: {result.inviteCode}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSendInvitation(result.id)}
                            disabled={sendInvitationMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Einladen
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {searchQuery.length > 0 && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine Haushalte gefunden
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
                Ausstehende Einladungen
                <Badge variant="secondary">{pendingInvitations.length}</Badge>
              </CardTitle>
              <CardDescription>
                Einladungen von anderen Haushalten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invitation.requestingHouseholdName}</p>
                      <p className="text-sm text-muted-foreground">
                        Eingeladen von {invitation.requesterName} · {" "}
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
                        Annehmen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectInvitation(invitation.id)}
                        disabled={rejectInvitationMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ablehnen
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
              Verbundene Haushalte
              <Badge variant="secondary">{connectedHouseholds.length}</Badge>
            </CardTitle>
            <CardDescription>
              Haushalte, mit denen Sie Aufgaben und Projekte teilen können
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingConnected ? (
              <p className="text-muted-foreground text-center py-8">Lade...</p>
            ) : connectedHouseholds.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Noch keine verbundenen Haushalte</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Laden Sie andere Haushalte ein, um gemeinsam Aufgaben zu planen
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
                          Verbunden seit {format(new Date(connectedHousehold.createdAt), "PPP", { locale: de })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveConnection(connectedHousehold.id)}
                        disabled={removeConnectionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Entfernen
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
            <CardTitle className="text-base">So funktioniert's</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>1. Haushalte verbinden:</strong> Suchen Sie nach anderen Haushalten über Namen oder Einladungscode
            </p>
            <p>
              <strong>2. Aufgaben teilen:</strong> Beim Erstellen von Aufgaben können Sie verbundene Haushalte auswählen
            </p>
            <p>
              <strong>3. Mitglieder zuweisen:</strong> Weisen Sie Aufgaben Mitgliedern aus allen verbundenen Haushalten zu
            </p>
            <p>
              <strong>4. Gemeinsam verwalten:</strong> Alle Mitglieder verbundener Haushalte können geteilte Aufgaben bearbeiten
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Home, Plus, LogIn, Users } from "lucide-react";

export default function HouseholdSelection() {
  const [, setLocation] = useLocation();

  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Get current user
  const { data: currentUser } = trpc.userAuth.getCurrentUser.useQuery();

  // Get user's households
  const { data: households, refetch: refetchHouseholds } = trpc.householdManagement.listUserHouseholds.useQuery();

  // Create household mutation
  const createHouseholdMutation = trpc.householdManagement.createHousehold.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Haushalt "${data.name}" wurde erfolgreich erstellt.`);
      setCreateDialogOpen(false);
      setNewHouseholdName("");
      refetchHouseholds();
    },
    onError: (error: any) => {
      toast.error(error.message || "Fehler beim Erstellen des Haushalts");
    },
  });

  // Join household mutation
  const joinHouseholdMutation = trpc.householdManagement.joinHousehold.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Sie sind dem Haushalt "${data.name}" beigetreten.`);
      setJoinDialogOpen(false);
      setInviteCode("");
      refetchHouseholds();
    },
    onError: (error: any) => {
      toast.error(error.message || "Fehler beim Beitreten");
    },
  });

  // Switch household mutation
  const switchHouseholdMutation = trpc.householdManagement.switchHousehold.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Willkommen im Haushalt "${data.householdName}"!`);
      
      // Store current household in localStorage
      localStorage.setItem("current_household", JSON.stringify({
        householdId: data.householdId,
        householdName: data.householdName,
        memberName: data.memberName,
      }));
      
      // Redirect to home
      setLocation("/");
    },
    onError: (error: any) => {
      toast.error(error.message || "Fehler beim Wechseln des Haushalts");
    },
  });

  const handleCreateHousehold = () => {
    if (!newHouseholdName.trim()) {
      toast.error("Bitte geben Sie einen Haushaltsnamen ein.");
      return;
    }

    createHouseholdMutation.mutate({
      householdName: newHouseholdName.trim(),
    } as any);
  };

  const handleJoinHousehold = () => {
    if (!inviteCode.trim()) {
      toast.error("Bitte geben Sie einen Einladungscode ein.");
      return;
    }

    joinHouseholdMutation.mutate({
      inviteCode: inviteCode.trim(),
    } as any);
  };

  const handleSelectHousehold = (householdId: number) => {
    switchHouseholdMutation.mutate({ householdId });
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_household");
    toast.success("Sie wurden erfolgreich abgemeldet.");
    setLocation("/user-login");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Home className="h-6 w-6 text-blue-600" />
                Haushaltsauswahl
              </CardTitle>
              <CardDescription className="mt-2">
                Willkommen, {currentUser.name}! Wählen Sie einen Haushalt aus oder erstellen Sie einen neuen.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Neuen Haushalt erstellen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Haushalt erstellen</DialogTitle>
                  <DialogDescription>
                    Geben Sie einen Namen für Ihren neuen Haushalt ein.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="householdName">Haushaltsname</Label>
                    <Input
                      id="householdName"
                      placeholder="z.B. Familie Müller"
                      value={newHouseholdName}
                      onChange={(e) => setNewHouseholdName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCreateHousehold}
                    disabled={createHouseholdMutation.isPending}
                    className="w-full"
                  >
                    {createHouseholdMutation.isPending ? "Erstelle..." : "Haushalt erstellen"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <LogIn className="mr-2 h-4 w-4" />
                  Haushalt beitreten
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Haushalt beitreten</DialogTitle>
                  <DialogDescription>
                    Geben Sie den Einladungscode ein, den Sie erhalten haben.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Einladungscode</Label>
                    <Input
                      id="inviteCode"
                      placeholder="z.B. ABC123XYZ"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <Button
                    onClick={handleJoinHousehold}
                    disabled={joinHouseholdMutation.isPending}
                    className="w-full"
                  >
                    {joinHouseholdMutation.isPending ? "Trete bei..." : "Beitreten"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Household List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span className="font-medium">Ihre Haushalte</span>
            </div>
            
            {!households || households.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    Sie sind noch keinem Haushalt zugeordnet.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Erstellen Sie einen neuen Haushalt oder treten Sie einem bestehenden bei.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {households.map((household: any) => (
                  <Card
                    key={household.householdId}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectHousehold(household.householdId)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-lg">{household.householdName}</h3>
                        <p className="text-sm text-gray-600">
                          Als: {household.memberName} • {household.role}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Auswählen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

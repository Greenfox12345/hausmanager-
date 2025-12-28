import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Users, LogOut, Plus } from "lucide-react";
import { useState } from "react";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, logout } = useCompatAuth();
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: members = [], isLoading } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const utils = trpc.useUtils();
  const addMemberMutation = trpc.household.addMember.useMutation({
    onSuccess: () => {
      toast.success("Mitglied erfolgreich hinzugefügt");
      setNewMemberName("");
      setNewMemberPassword("");
      setShowAddForm(false);
      utils.household.getHouseholdMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Hinzufügen des Mitglieds");
    },
  });

  // Auth check removed - AppLayout handles this

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Haushaltsmitglieder</h1>
            <p className="text-muted-foreground">{household.householdName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Aktuelle Mitglieder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Lädt Mitglieder...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Mitglieder gefunden.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      m.id === member.memberId
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:bg-accent/5"
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.photoUrl || undefined} alt={m.memberName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(m.memberName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        {m.memberName}
                        {m.id === member.memberId && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Sie
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {m.isActive ? "Aktiv" : "Inaktiv"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Neues Mitglied hinzufügen
              </span>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  Hinzufügen
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showAddForm ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMemberName.trim()) {
                    toast.error("Bitte geben Sie einen Namen ein");
                    return;
                  }
                  if (!newMemberPassword.trim()) {
                    toast.error("Bitte geben Sie ein Passwort ein");
                    return;
                  }
                  addMemberMutation.mutate({
                    householdId: household.householdId,
                    memberName: newMemberName.trim(),
                    password: newMemberPassword,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="memberName">Name des Mitglieds</Label>
                  <Input
                    id="memberName"
                    type="text"
                    placeholder="z.B. Max Mustermann"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    disabled={addMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberPassword">Persönliches Passwort</Label>
                  <Input
                    id="memberPassword"
                    type="password"
                    placeholder="Passwort für dieses Mitglied"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    disabled={addMemberMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dieses Mitglied meldet sich mit dem Haushaltspasswort + diesem persönlichen Passwort an.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={addMemberMutation.isPending}
                    className="flex-1"
                  >
                    {addMemberMutation.isPending ? "Wird hinzugefügt..." : "Mitglied hinzufügen"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewMemberName("");
                      setNewMemberPassword("");
                    }}
                    disabled={addMemberMutation.isPending}
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>
                  Klicken Sie auf "Hinzufügen", um ein neues Haushaltsmitglied zu erstellen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

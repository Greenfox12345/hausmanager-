import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, LogOut } from "lucide-react";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, logout } = useHouseholdAuth();

  const { data: members = [], isLoading } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  if (!isAuthenticated || !household || !member) {
    setLocation("/login");
    return null;
  }

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
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
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>
              Weitere Funktionen zur Mitgliederverwaltung wie Hinzufügen, Bearbeiten
              und Löschen von Mitgliedern können hier implementiert werden.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

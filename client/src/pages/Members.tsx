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
import { ArrowLeft, Users, LogOut, Plus, Copy, Check } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, logout } = useCompatAuth();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: members = [], isLoading } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const handleCopyInviteCode = async () => {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      toast.success("Einladungscode kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Fehler beim Kopieren");
    }
  };

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
      <div className="container py-6 max-w-4xl pb-24">
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
            <p className="text-muted-foreground">{household?.householdName}</p>
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
                      m.id === member?.memberId
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
                        {m.id === member?.memberId && (
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
                Neues Mitglied einladen
              </span>
              {!showInviteCode && (
                <Button onClick={() => setShowInviteCode(true)} size="sm">
                  Einladungscode anzeigen
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInviteCode ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>👥 Teilen Sie diesen Einladungscode mit neuen Mitgliedern:</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Input
                    value={household?.inviteCode || ""}
                    readOnly
                    className="font-mono text-lg text-center"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCopyInviteCode}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p><strong>💡 So funktioniert's:</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Neue Person registriert sich auf der Registrierungsseite</li>
                    <li>Bei der Haushaltsauswahl klickt sie auf "Haushalt beitreten"</li>
                    <li>Einladungscode eingeben und bestätigen</li>
                    <li>Fertig! Die Person ist jetzt Mitglied Ihres Haushalts</li>
                  </ol>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowInviteCode(false)}
                  className="w-full"
                >
                  Schließen
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>
                  Klicken Sie auf "Einladungscode anzeigen", um neue Mitglieder einzuladen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </AppLayout>
  );
}

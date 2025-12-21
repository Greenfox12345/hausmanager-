import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { Home, Users, ArrowRight, Plus } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setHousehold, setMember } = useHouseholdAuth();
  const [step, setStep] = useState<"household" | "member" | "create">("household");
  const [householdName, setHouseholdName] = useState("");
  const [householdPassword, setHouseholdPassword] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(null);

  const { data: households } = trpc.household.listHouseholds.useQuery();
  const loginHouseholdMutation = trpc.household.loginHousehold.useMutation();
  const loginMemberMutation = trpc.household.loginMember.useMutation();
  const createHouseholdMutation = trpc.household.createHousehold.useMutation();
  const createMemberMutation = trpc.household.createMember.useMutation();

  const handleHouseholdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginHouseholdMutation.mutateAsync({
        name: householdName,
        password: householdPassword,
      });
      setHousehold({
        householdId: result.householdId,
        householdName: result.name,
      });
      setSelectedHouseholdId(result.householdId);
      setStep("member");
      toast.success(`Willkommen im Haushalt ${result.name}!`);
    } catch (error: any) {
      toast.error(error.message || "Anmeldung fehlgeschlagen");
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseholdId) return;

    try {
      const result = await loginMemberMutation.mutateAsync({
        householdId: selectedHouseholdId,
        memberName,
        password: memberPassword,
      });
      setMember({
        memberId: result.memberId,
        memberName: result.memberName,
        householdId: result.householdId,
        photoUrl: result.photoUrl || undefined,
      });
      toast.success(`Willkommen, ${result.memberName}!`);
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Anmeldung fehlgeschlagen");
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const householdResult = await createHouseholdMutation.mutateAsync({
        name: householdName,
        password: householdPassword,
      });
      
      setHousehold({
        householdId: householdResult.householdId,
        householdName: householdResult.name,
      });
      setSelectedHouseholdId(householdResult.householdId);

      // Create first member
      const memberResult = await createMemberMutation.mutateAsync({
        householdId: householdResult.householdId,
        memberName,
        password: memberPassword,
      });

      setMember({
        memberId: memberResult.memberId,
        memberName: memberResult.memberName,
        householdId: householdResult.householdId,
      });

      toast.success("Haushalt erfolgreich erstellt!");
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Erstellung fehlgeschlagen");
    }
  };

  if (step === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              Neuen Haushalt erstellen
            </CardTitle>
            <CardDescription>
              Erstellen Sie einen neuen Haushalt und das erste Mitglied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newHouseholdName">Haushaltsname</Label>
                <Input
                  id="newHouseholdName"
                  type="text"
                  placeholder="z.B. Familie Müller"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newHouseholdPassword">Haushalts-Passwort</Label>
                <Input
                  id="newHouseholdPassword"
                  type="password"
                  placeholder="Mindestens 4 Zeichen"
                  value={householdPassword}
                  onChange={(e) => setHouseholdPassword(e.target.value)}
                  required
                  minLength={4}
                />
              </div>
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Erstes Mitglied</h3>
                <div className="space-y-2">
                  <Label htmlFor="firstMemberName">Mitgliedsname</Label>
                  <Input
                    id="firstMemberName"
                    type="text"
                    placeholder="z.B. Max"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="firstMemberPassword">Mitglieds-Passwort</Label>
                  <Input
                    id="firstMemberPassword"
                    type="password"
                    placeholder="Mindestens 4 Zeichen"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("household")}
                >
                  Zurück
                </Button>
                <Button type="submit" className="flex-1" disabled={createHouseholdMutation.isPending}>
                  {createHouseholdMutation.isPending ? "Erstelle..." : "Haushalt erstellen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "member") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Mitglied auswählen
            </CardTitle>
            <CardDescription>
              Melden Sie sich als Haushaltsmitglied an
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">Mitgliedsname</Label>
                <Input
                  id="memberName"
                  type="text"
                  placeholder="Ihr Name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberPassword">Passwort</Label>
                <Input
                  id="memberPassword"
                  type="password"
                  placeholder="Ihr Passwort"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("household");
                    setHousehold(null);
                  }}
                >
                  Zurück
                </Button>
                <Button type="submit" className="flex-1" disabled={loginMemberMutation.isPending}>
                  {loginMemberMutation.isPending ? "Anmelden..." : "Anmelden"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            Haushaltsmanager
          </CardTitle>
          <CardDescription>
            Wählen Sie Ihren Haushalt aus oder erstellen Sie einen neuen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleHouseholdLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Haushaltsname</Label>
              <Input
                id="householdName"
                type="text"
                placeholder="z.B. Familie Müller"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="householdPassword">Passwort</Label>
              <Input
                id="householdPassword"
                type="password"
                placeholder="Haushalts-Passwort"
                value={householdPassword}
                onChange={(e) => setHouseholdPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginHouseholdMutation.isPending}>
              {loginHouseholdMutation.isPending ? "Anmelden..." : "Haushalt anmelden"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Oder</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={() => setStep("create")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neuen Haushalt erstellen
            </Button>
          </div>

          {households && households.length > 0 && (
            <div className="mt-6">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Verfügbare Haushalte:
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {households.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors text-sm"
                    onClick={() => setHouseholdName(h.name)}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

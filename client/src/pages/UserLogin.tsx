import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Home } from "lucide-react";

export default function UserLogin() {
  const [, setLocation] = useLocation();

  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const loginMutation = trpc.userAuth.login.useMutation({
    onSuccess: (data) => {
      // Store JWT token
      localStorage.setItem("auth_token", data.token);
      
      toast.success(`Willkommen zurück, ${data.user.name}!`);
      
      // Redirect to household selection
      setLocation("/household-selection");
    },
    onError: (error) => {
      toast.error(error.message || "Anmeldung fehlgeschlagen");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Bitte füllen Sie alle Felder aus.");
      return;
    }

    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Home className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Haushaltsmanager</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihrem Benutzerkonto an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@beispiel.de"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ihr Passwort"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loginMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Anmelden..." : "Anmelden"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Noch kein Konto?{" "}
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-blue-600 hover:underline"
              >
                Jetzt registrieren
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

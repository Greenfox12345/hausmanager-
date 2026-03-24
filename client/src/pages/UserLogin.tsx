import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Home } from "lucide-react";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";
import { useTranslation } from "react-i18next";

export default function UserLogin() {
  const [, setLocation] = useLocation();
  const { login } = useUserAuth();
  const { t } = useTranslation("auth");
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const loginMutation = trpc.userAuth.login.useMutation({
    onSuccess: (data) => {
      // Update auth context with token
      login(data.token);
      
      toast.success(t("login.welcomeBack", "Willkommen zurück, {{name}}!", { name: data.user.name }));
      
      // Redirect to household selection
      setLocation("/household-selection");
    },
    onError: (error) => {
      toast.error(error.message || t("login.error", "Anmeldung fehlgeschlagen"));
    },
  });

  const handleLanguageChange = async (code: SupportedLanguageCode) => {
    await changeLanguage(code);
    setCurrentLang(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error(t("login.fillAllFields", "Bitte füllen Sie alle Felder aus."));
      return;
    }

    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Language flag buttons – top right corner */}
      <div className="fixed top-4 right-4 flex items-center gap-1">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            title={lang.name}
            className={`text-xl leading-none rounded-md px-1.5 py-1 transition-all ${
              currentLang === lang.code
                ? "ring-2 ring-blue-500 bg-white/80 shadow-sm scale-110"
                : "opacity-60 hover:opacity-100 hover:bg-white/60"
            }`}
          >
            {lang.flag}
          </button>
        ))}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Home className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Haushaltsmanager</CardTitle>
          <CardDescription>
            {t("login.subtitle", "Melden Sie sich mit Ihrem Benutzerkonto an")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email", "E-Mail")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("login.emailPlaceholder", "ihre.email@beispiel.de")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password", "Passwort")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("login.passwordPlaceholder", "Ihr Passwort")}
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
              {loginMutation.isPending ? t("login.loading", "Anmelden...") : t("login.submit", "Anmelden")}
            </Button>

            <div className="text-center text-sm text-gray-600">
              {t("login.noAccount", "Noch kein Konto?")}{" "}
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-blue-600 hover:underline"
              >
                {t("login.register", "Jetzt registrieren")}
              </button>
            </div>
            <div className="text-center text-xs text-gray-400 mt-1">
              <button
                type="button"
                onClick={() => setLocation("/privacy")}
                className="hover:underline"
              >
                {t("login.privacy", "Datenschutzerklärung")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

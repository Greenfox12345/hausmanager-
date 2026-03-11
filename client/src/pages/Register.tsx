import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";

export default function Register() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation("auth");
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const registerMutation = trpc.userAuth.register.useMutation({
    onSuccess: () => {
      toast.success(t("register.success", "Registrierung erfolgreich! Sie können sich jetzt anmelden."));
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message || t("register.error", "Registrierung fehlgeschlagen"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.name) {
      toast.error(t("login.fillAllFields", "Bitte füllen Sie alle Felder aus."));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("register.passwordMismatch", "Die Passwörter stimmen nicht überein."));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t("register.passwordTooShort", "Das Passwort muss mindestens 6 Zeichen lang sein."));
      return;
    }

    registerMutation.mutate({
      email: formData.email,
      password: formData.password,
      name: formData.name,
    });
  };

  const handleLanguageChange = async (code: SupportedLanguageCode) => {
    await changeLanguage(code);
    setCurrentLang(code);
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
            {t("register.subtitle", "Erstellen Sie ein neues Benutzerkonto")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("register.username", "Name")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("register.usernamePlaceholder", "z.B. Max Mustermann")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email", "E-Mail")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("login.emailPlaceholder", "ihre.email@beispiel.de")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password", "Passwort")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("register.passwordPlaceholder", "Mindestens 6 Zeichen")}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("register.confirmPassword", "Passwort bestätigen")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("register.confirmPasswordPlaceholder", "Passwort wiederholen")}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={registerMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? t("register.loading", "Wird registriert...")
                : t("register.submit", "Registrieren")}
            </Button>

            <div className="text-center text-sm text-gray-600">
              {t("register.hasAccount", "Bereits registriert?")}{" "}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-blue-600 hover:underline"
              >
                {t("register.login", "Jetzt anmelden")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

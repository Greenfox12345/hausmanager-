import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Home, FlaskConical, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";
import DemoOnboardingDialog from "@/components/DemoOnboardingDialog";

export default function Register() {
  const [location, setLocation] = useLocation();
  const { login, setCurrentHousehold } = useUserAuth();
  const { t } = useTranslation("auth");
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  // Extract demo token from URL query param or localStorage
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const demoTokenFromUrl = searchParams.get("demo");
  const demoTokenFromStorage = localStorage.getItem("demo_token");
  const demoToken = demoTokenFromUrl ?? demoTokenFromStorage ?? null;
  const demoExpiresAt = localStorage.getItem("demo_expires_at");
  const isDemoActive = demoToken !== null && demoExpiresAt !== null && new Date(demoExpiresAt) > new Date();

  // Extract member invite token from URL query param (?invite=...)
  const inviteToken = searchParams.get("invite") ?? null;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  // Post-claim onboarding state
  const [onboardingHouseholdId, setOnboardingHouseholdId] = useState<number | null>(null);

  const registerMutation = trpc.userAuth.register.useMutation({
    onSuccess: async (data) => {
      // Log in the user first so subsequent tRPC calls are authenticated
      if (data.token) {
        login(data.token);
      }

      if (data.claimedHouseholdId && data.claimedMemberId) {
        // Clear demo storage (auth_token was already replaced by login() above)
        localStorage.removeItem("demo_token");
        localStorage.removeItem("demo_expires_at");

        // Set household context
        setCurrentHousehold({
          householdId: data.claimedHouseholdId,
          householdName: "Mein Haushalt",
          memberId: data.claimedMemberId,
          memberName: formData.name,
        });

        toast.success(t("demo.demoHouseholdClaimed", "Demo-Haushalt erfolgreich übernommen!"));
        // Guard: prevent redirectToLoginIfUnauthorized from firing during onboarding
        localStorage.setItem("onboarding_in_progress", "1");
        // Show onboarding dialog
        setOnboardingHouseholdId(data.claimedHouseholdId);
      } else {
        toast.success(t("register.success", "Registrierung erfolgreich! Sie können sich jetzt anmelden."));
        if (data.token) {
          setLocation("/household-selection");
        } else {
          setLocation("/login");
        }
      }
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
      demoToken: isDemoActive ? (demoToken ?? undefined) : undefined,
      inviteToken: inviteToken ?? undefined,
    });
  };

  const handleLanguageChange = async (code: SupportedLanguageCode) => {
    await changeLanguage(code);
    setCurrentLang(code);
  };

  function handleOnboardingClose() {
    localStorage.removeItem("onboarding_in_progress");
    setOnboardingHouseholdId(null);
    setLocation("/shopping");
  }

  return (
    <>
      {/* Post-claim onboarding dialog */}
      {onboardingHouseholdId !== null && (
        <DemoOnboardingDialog
          open={true}
          householdId={onboardingHouseholdId}
          onClose={handleOnboardingClose}
        />
      )}

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
              {isDemoActive ? (
                <div className="relative">
                  <Home className="h-12 w-12 text-blue-600" />
                  <FlaskConical className="h-5 w-5 text-amber-500 absolute -top-1 -right-2" />
                </div>
              ) : (
                <Home className="h-12 w-12 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">Haushaltsmanager</CardTitle>
            <CardDescription>
              {isDemoActive
                ? t("demo.registerWithDemo", "Konto erstellen & Demo-Haushalt übernehmen")
                : t("register.subtitle", "Erstellen Sie ein neues Benutzerkonto")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo hint banner */}
            {isDemoActive && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                <FlaskConical className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  {t("demo.demoBannerText", "Sie befinden sich im Demo-Modus. Ihre Daten werden nach 24 Stunden gelöscht.")}{" "}
                  <strong>{t("demo.demoBannerClaim", "Jetzt Konto erstellen & Haushalt behalten")}</strong>
                </p>
              </div>
            )}

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
                className={`w-full gap-2 ${isDemoActive ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                disabled={registerMutation.isPending}
              >
                {isDemoActive && <UserPlus className="h-4 w-4" />}
                {registerMutation.isPending
                  ? t("register.loading", "Wird registriert...")
                  : isDemoActive
                    ? t("demo.registerWithDemo", "Konto erstellen & Demo-Haushalt übernehmen")
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
              <div className="text-center text-xs text-gray-400 mt-1 flex justify-center gap-3">
                <Link href="/privacy" className="hover:underline">
                  {t("register.privacy", "Datenschutzerklärung")}
                </Link>
                <span>·</span>
                <Link href="/imprint" className="hover:underline">
                  {t("register.imprint", "Impressum")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

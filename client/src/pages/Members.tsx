import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Users, LogOut, Plus, Copy, Check, Globe, Home, Lock } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, logout } = useCompatAuth();
  const { currentHousehold } = useUserAuth();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(["members", "common"]);

  const householdId = currentHousehold?.householdId;

  const { data: members = [], isLoading } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Household language settings
  const { data: settings, refetch: refetchSettings } = trpc.householdManagement.getHouseholdSettings.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const updateLanguageMutation = trpc.householdManagement.updateHouseholdLanguage.useMutation({
    onSuccess: () => {
      toast.success(t("common:household.settings.saved", "Einstellungen gespeichert"));
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const currentHouseholdLang = settings?.language || "de";
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentHouseholdLang);

  const handleHouseholdLanguageChange = (code: SupportedLanguageCode) => {
    if (!householdId) return;
    updateLanguageMutation.mutate({ householdId, language: code });
  };

  const handleCopyInviteCode = async () => {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      toast.success(t("members.messages.inviteCodeCopied", "Einladungscode kopiert!"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("common.messages.copyError", "Fehler beim Kopieren"));
    }
  };

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
        {/* Header */}
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Home className="h-7 w-7 text-primary" />
              {t("members.householdTitle", "Haushalt")}
            </h1>
            <p className="text-muted-foreground">{household?.householdName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t("common.actions.logout", "Abmelden")}
          </Button>
        </div>

        {/* Members Card */}
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("members.currentMembers", "Aktuelle Mitglieder")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("members.messages.loadingMembers", "Lädt Mitglieder...")}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("members.messages.noMembersFound", "Keine Mitglieder gefunden.")}
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
                            {t("members.you", "Sie")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {m.isActive ? t("common.status.active", "Aktiv") : t("common.status.inactive", "Inaktiv")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Card */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t("members.newMember", "Neues Mitglied einladen")}
              </span>
              {!showInviteCode && (
                <Button onClick={() => setShowInviteCode(true)} size="sm">
                  {t("members.actions.showInviteCode", "Einladungscode anzeigen")}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInviteCode ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>{t("members.messages.shareInviteCode", "👥 Teilen Sie diesen Einladungscode mit neuen Mitgliedern:")}</p>
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
                  <p><strong>{t("common.messages.howItWorks", "💡 So funktioniert's:")}</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>{t("members.messages.step1", "Neue Person registriert sich auf der Registrierungsseite")}</li>
                    <li>{t("members.messages.step2", "Bei der Haushaltsauswahl klickt sie auf \"Haushalt beitreten\"")}</li>
                    <li>{t("members.messages.step3", "Einladungscode eingeben und bestätigen")}</li>
                    <li>{t("members.messages.step4", "Fertig! Die Person ist jetzt Mitglied Ihres Haushalts")}</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteCode(false)}
                  className="w-full"
                >
                  {t("common.actions.close", "Schließen")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>
                  {t("members.messages.clickToShowInviteCode", "Klicken Sie auf \"Einladungscode anzeigen\", um neue Mitglieder einzuladen.")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Settings Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5" />
              {t("common:language.title", "Spracheinstellungen")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* UI Language */}
            <div>
              <p className="text-sm font-medium mb-1">{t("common:language.uiLanguage", "Meine Anzeigesprache")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("common:language.uiLanguageHint", "Gilt nur für dieses Gerät")}</p>
              <LanguageSwitcher />
            </div>

            <Separator />

            {/* Household Language */}
            <div>
              <p className="text-sm font-medium mb-1">{t("common:household.language", "Haushaltssprache")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("common:household.languageHint", "Wird für Verlauf und Benachrichtigungen verwendet")}</p>

              {settings?.isAdmin ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={currentHouseholdLang === lang.code ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleHouseholdLanguageChange(lang.code)}
                        disabled={updateLanguageMutation.isPending}
                        className="gap-2"
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {currentHouseholdLang === lang.code && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("common:household.adminOnly", "Nur Admins können die Haushaltssprache ändern.")}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm">
                      {t("common:labels.language", "Sprache")}:{" "}
                      <strong>{currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}</strong>
                    </p>
                    <p className="text-xs mt-1">
                      {t("common:household.adminOnly", "Nur der Haushaltsersteller kann die Haushaltssprache ändern.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </AppLayout>
  );
}

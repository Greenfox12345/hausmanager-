import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Settings, Users, Lock, ChevronLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n";
import { useLocation } from "wouter";

export default function HouseholdSettings() {
  const { t } = useTranslation("common");
  const { currentHousehold } = useUserAuth();
  const [, setLocation] = useLocation();

  const householdId = currentHousehold?.householdId;

  // Load household settings
  const { data: settings, refetch: refetchSettings } = trpc.householdManagement.getHouseholdSettings.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  // Mutation to update household language
  const updateLanguageMutation = trpc.householdManagement.updateHouseholdLanguage.useMutation({
    onSuccess: (data) => {
      toast.success(t("household.settings.saved"));
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleLanguageChange = (code: SupportedLanguageCode) => {
    if (!householdId) return;
    updateLanguageMutation.mutate({ householdId, language: code });
  };

  const currentHouseholdLang = settings?.language || "de";
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentHouseholdLang);

  if (!householdId) {
    return (
      <AppLayout>
        <div className="container py-8">
          <p className="text-muted-foreground">{t("household.select")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6" />
              {t("household.settings.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {settings?.name || currentHousehold?.householdName}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* UI Language Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {t("language.uiLanguage")}
              </CardTitle>
              <CardDescription>
                {t("language.uiLanguageHint")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("language.select")}:</span>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          {/* Household Language Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {t("household.language")}
              </CardTitle>
              <CardDescription>
                {t("household.languageHint")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings?.isAdmin ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">{t("labels.language")}:</span>
                    <Badge variant="outline">
                      {currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={currentHouseholdLang === lang.code ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLanguageChange(lang.code)}
                        disabled={updateLanguageMutation.isPending}
                        className="justify-start gap-2"
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {currentHouseholdLang === lang.code && (
                          <span className="ml-auto text-xs">✓</span>
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("household.settings.languageHint")}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm">
                      {t("labels.language")}: <strong>{currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}</strong>
                    </p>
                    <p className="text-xs mt-1">
                      Nur der Haushaltsersteller kann die Haushaltssprache ändern.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Info Card */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>{t("household.settings.general")}:</strong> {settings?.name}
              </p>
              {settings?.inviteCode && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{t("household.inviteCode")}:</strong>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                    {settings.inviteCode}
                  </code>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

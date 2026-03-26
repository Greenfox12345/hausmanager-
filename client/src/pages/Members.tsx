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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Users, LogOut, Plus, Copy, Check, Globe, Home, Lock, DoorOpen, Trash2, Vote, Undo2 } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/lib/i18n";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, logout } = useCompatAuth();
  const { currentHousehold, setCurrentHousehold } = useUserAuth();
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

  // Dissolve vote status
  const { data: dissolveStatus, refetch: refetchDissolveStatus } = trpc.householdManagement.getDissolveStatus.useQuery(
    { householdId: householdId! },
    { enabled: !!householdId }
  );

  const updateLanguageMutation = trpc.householdManagement.updateHouseholdLanguage.useMutation({
    onSuccess: () => {
      toast.success(t("common:household.settings.saved"));
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Leave household mutation
  const leaveHouseholdMutation = trpc.householdManagement.leaveHousehold.useMutation({
    onSuccess: (data) => {
      if (data.dissolved) {
        toast.success(t("members:household.dissolvedAfterLeave"));
      } else {
        toast.success(t("members:household.leftSuccess"));
      }
      // Clear local household state and redirect
      logout();
      setLocation("/household-selection");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Vote to dissolve mutation
  const voteDisolveMutation = trpc.householdManagement.voteDissolveHousehold.useMutation({
    onSuccess: (data) => {
      if (data.dissolved) {
        toast.success(t("members:household.dissolvedByVote"));
        logout();
        setLocation("/household-selection");
      } else {
        toast.success(
          t("members:household.voteRecorded", {
            count: data.voteCount,
            total: data.totalMembers,
            needed: Math.floor(data.totalMembers / 2) + 1,
          })
        );
        refetchDissolveStatus();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Retract dissolve vote mutation
  const retractVoteMutation = trpc.householdManagement.retractDissolveVote.useMutation({
    onSuccess: () => {
      toast.success(t("members:household.voteRetracted"));
      refetchDissolveStatus();
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
      toast.success(t("members:messages.inviteCodeCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("common:messages.copyError"));
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

  const voteProgress = dissolveStatus
    ? Math.round((dissolveStatus.voteCount / dissolveStatus.totalMembers) * 100)
    : 0;

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
              {t("members:householdTitle")}
            </h1>
            <p className="text-muted-foreground">{household?.householdName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t("common:actions.logout")}
          </Button>
        </div>

        {/* Members Card */}
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("members:currentMembers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("members:messages.loadingMembers")}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("members:messages.noMembersFound")}
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
                            {t("members:you")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {m.isActive ? t("common:status.active") : t("common:status.inactive")}
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
                {t("members:newMember")}
              </span>
              {!showInviteCode && (
                <Button onClick={() => setShowInviteCode(true)} size="sm">
                  {t("members:actions.showInviteCode")}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInviteCode ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>{t("members:messages.shareInviteCode")}</p>
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
                  <p><strong>{t("common:messages.howItWorks")}</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>{t("members:messages.step1")}</li>
                    <li>{t("members:messages.step2")}</li>
                    <li>{t("members:messages.step3")}</li>
                    <li>{t("members:messages.step4")}</li>
                  </ol>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteCode(false)}
                  className="w-full"
                >
                  {t("common:actions.close")}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>
                  {t("members:messages.clickToShowInviteCode")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Settings Card */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5" />
              {t("common:language.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* UI Language */}
            <div>
              <p className="text-sm font-medium mb-1">{t("common:language.uiLanguage")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("common:language.uiLanguageHint")}</p>
              <LanguageSwitcher />
            </div>

            <Separator />

            {/* Household Language */}
            <div>
              <p className="text-sm font-medium mb-1">{t("common:household.language")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("common:household.languageHint")}</p>

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
                    {t("common:household.adminOnly")}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm">
                      {t("common:labels.language")}:{" "}
                      <strong>{currentLangInfo?.flag} {currentLangInfo?.name || currentHouseholdLang}</strong>
                    </p>
                    <p className="text-xs mt-1">
                      {t("common:household.adminOnly")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="shadow-sm border border-destructive/20 bg-destructive/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive uppercase tracking-wide">
              <Trash2 className="h-4 w-4" />
              {t("members:household.dangerZone")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">

            {/* Leave Household */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-t border-destructive/10">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <DoorOpen className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t("members:household.leaveTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t("members:household.leaveDescription")}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60"
                    disabled={leaveHouseholdMutation.isPending}
                  >
                    <DoorOpen className="h-3.5 w-3.5" />
                    {t("members:household.leaveButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("members:household.leaveConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("members:household.leaveConfirmDescription", { name: household?.householdName })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => householdId && leaveHouseholdMutation.mutate({ householdId })}
                    >
                      {t("members:household.leaveButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Dissolve Household by Vote */}
            <div className="px-6 py-4 border-t border-destructive/10 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <Vote className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t("members:household.dissolveTitle")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {t("members:household.dissolveDescription", {
                        needed: dissolveStatus?.majorityNeeded ?? "?",
                        total: dissolveStatus?.totalMembers ?? "?",
                      })}
                    </p>
                  </div>
                </div>

              </div>

              {/* Vote progress bar – full width below the title row */}
              {dissolveStatus && dissolveStatus.totalMembers > 0 && (
                <div className="space-y-1.5 pl-11">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t("members:household.votesCount", {
                        count: dissolveStatus.voteCount,
                        total: dissolveStatus.totalMembers,
                      })}
                    </span>
                    <span className="text-destructive/70 font-medium">
                      {t("members:household.votesNeeded", { needed: dissolveStatus.majorityNeeded })}
                    </span>
                  </div>
                  <Progress
                    value={voteProgress}
                    className="h-1.5 [&>div]:bg-destructive"
                  />
                </div>
              )}

              {/* Action button or already-voted state */}
              <div className="pl-11 flex items-center gap-3 flex-wrap">
                {!dissolveStatus?.hasVoted ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60"
                        disabled={voteDisolveMutation.isPending}
                      >
                        <Vote className="h-3.5 w-3.5" />
                        {t("members:household.dissolveVoteButton")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("members:household.dissolveConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("members:household.dissolveConfirmDescription", {
                            name: household?.householdName,
                            needed: dissolveStatus?.majorityNeeded ?? "?",
                            total: dissolveStatus?.totalMembers ?? "?",
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => householdId && voteDisolveMutation.mutate({ householdId })}
                        >
                          {t("members:household.dissolveVoteButton")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="gap-1">
                      <Vote className="h-3 w-3" />
                      {t("members:household.alreadyVoted")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      onClick={() => householdId && retractVoteMutation.mutate({ householdId })}
                      disabled={retractVoteMutation.isPending}
                    >
                      <Undo2 className="h-3 w-3" />
                      {t("members:household.retractVote")}
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </AppLayout>
  );
}

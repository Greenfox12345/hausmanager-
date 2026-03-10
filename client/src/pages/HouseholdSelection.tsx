import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Home, Plus, LogIn, Users, User, Settings } from "lucide-react";
import { InviteCodeDialog } from "@/components/InviteCodeDialog";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";

export default function HouseholdSelection() {
  const [, setLocation] = useLocation();
  const { setCurrentHousehold, token, isAuthenticated } = useUserAuth();
  const { t } = useTranslation(["auth", "common"]);
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeDialogOpen, setInviteCodeDialogOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [createdHousehold, setCreatedHousehold] = useState<{ name: string; inviteCode: string } | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Get current user
  const { data: currentUser, isLoading: userLoading } = trpc.userAuth.getCurrentUser.useQuery(
    { token: token || undefined },
    { enabled: !!token, retry: false }
  );

  // Get user's households
  const { data: households, refetch: refetchHouseholds } = trpc.householdManagement.listUserHouseholds.useQuery(
    { userId: currentUser?.id },
    { enabled: !!currentUser?.id }
  );

  // Create household mutation
  const createHouseholdMutation = trpc.householdManagement.createHousehold.useMutation({
    onSuccess: (data: any) => {
      setCreatedHousehold({
        name: data.household.name,
        inviteCode: data.household.inviteCode,
      });
      setCreateDialogOpen(false);
      setNewHouseholdName("");
      setInviteCodeDialogOpen(true);
      refetchHouseholds();
    },
    onError: (error: any) => {
      toast.error(error.message || t("householdSelection.createError", "Fehler beim Erstellen des Haushalts"));
    },
  });

  // Join household mutation
  const joinHouseholdMutation = trpc.householdManagement.joinHousehold.useMutation({
    onSuccess: (data: any) => {
      toast.success(t("householdSelection.joinSuccess", "Sie sind dem Haushalt \"{{name}}\" beigetreten.", { name: data.household.name }));
      setJoinDialogOpen(false);
      setInviteCode("");
      refetchHouseholds();
    },
    onError: (error: any) => {
      toast.error(error.message || t("householdSelection.joinError", "Fehler beim Beitreten"));
    },
  });

  // Switch household mutation
  const switchHouseholdMutation = trpc.householdManagement.switchHousehold.useMutation({
    onSuccess: (data: any) => {
      setCurrentHousehold({
        householdId: data.householdId,
        householdName: data.householdName,
        memberId: data.memberId,
        memberName: data.memberName,
        inviteCode: data.inviteCode,
      });
      toast.success(t("householdSelection.switchSuccess", "Willkommen im Haushalt \"{{name}}\"!", { name: data.householdName }));
      setLocation("/");
    },
    onError: (error: any) => {
      toast.error(error.message || t("householdSelection.switchError", "Fehler beim Wechseln des Haushalts"));
    },
  });

  const handleCreateHousehold = () => {
    if (!newHouseholdName.trim()) {
      toast.error(t("householdSelection.enterHouseholdName", "Bitte geben Sie einen Haushaltsnamen ein."));
      return;
    }
    createHouseholdMutation.mutate({
      householdName: newHouseholdName.trim(),
    } as any);
  };

  const handleJoinHousehold = () => {
    if (!inviteCode.trim()) {
      toast.error(t("householdSelection.enterInviteCode", "Bitte geben Sie einen Einladungscode ein."));
      return;
    }
    joinHouseholdMutation.mutate({
      inviteCode: inviteCode.trim(),
    } as any);
  };

  const handleSelectHousehold = (householdId: number) => {
    switchHouseholdMutation.mutate({ householdId });
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_household");
    localStorage.removeItem("household");
    localStorage.removeItem("member");
    toast.success(t("auth:logout.success", "Sie wurden erfolgreich abgemeldet."));
    setLocation("/login");
  };

  const handleLanguageChange = async (code: SupportedLanguageCode) => {
    await changeLanguage(code);
    setCurrentLang(code);
  };

  // Redirect to login only if no token exists
  if (!token) {
    setLocation("/login");
    return null;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common:common.messages.loading", "Laden...")}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("householdSelection.userLoadError", "Fehler beim Laden des Benutzers...")}</p>
      </div>
    );
  }

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

      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Home className="h-6 w-6 text-blue-600" />
                {t("householdSelection.title", "Haushaltsauswahl")}
              </CardTitle>
              <CardDescription className="mt-2">
                {t("householdSelection.subtitle", "Willkommen, {{name}}! Wählen Sie einen Haushalt aus oder erstellen Sie einen neuen.", { name: currentUser.name })}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              {t("auth:logout.action", "Abmelden")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Profile Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                  {currentUser.profileImageUrl ? (
                    <img
                      src={currentUser.profileImageUrl}
                      alt={currentUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentUser.name}</h3>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfileDialogOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("householdSelection.editProfile", "Profil bearbeiten")}
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("householdSelection.createNew", "Neuen Haushalt erstellen")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("householdSelection.createNew", "Neuen Haushalt erstellen")}</DialogTitle>
                  <DialogDescription>
                    {t("householdSelection.createDescription", "Geben Sie einen Namen für Ihren neuen Haushalt ein.")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="householdName">{t("householdSelection.householdName", "Haushaltsname")}</Label>
                    <Input
                      id="householdName"
                      placeholder={t("householdSelection.householdNamePlaceholder", "z.B. Familie Müller")}
                      value={newHouseholdName}
                      onChange={(e) => setNewHouseholdName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCreateHousehold}
                    disabled={createHouseholdMutation.isPending}
                    className="w-full"
                  >
                    {createHouseholdMutation.isPending
                      ? t("householdSelection.creating", "Erstelle...")
                      : t("householdSelection.createButton", "Haushalt erstellen")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("householdSelection.join", "Haushalt beitreten")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("householdSelection.join", "Haushalt beitreten")}</DialogTitle>
                  <DialogDescription>
                    {t("householdSelection.joinDescription", "Geben Sie den Einladungscode ein, den Sie erhalten haben.")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">{t("householdSelection.inviteCode", "Einladungscode")}</Label>
                    <Input
                      id="inviteCode"
                      placeholder={t("householdSelection.inviteCodePlaceholder", "z.B. ABC123XYZ")}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <Button
                    onClick={handleJoinHousehold}
                    disabled={joinHouseholdMutation.isPending}
                    className="w-full"
                  >
                    {joinHouseholdMutation.isPending
                      ? t("householdSelection.joining", "Trete bei...")
                      : t("householdSelection.joinButton", "Beitreten")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Household List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span className="font-medium">{t("householdSelection.yourHouseholds", "Ihre Haushalte")}</span>
            </div>

            {!households || households.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    {t("householdSelection.noHouseholds", "Sie sind noch keinem Haushalt zugeordnet.")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("householdSelection.noHouseholdsHint", "Erstellen Sie einen neuen Haushalt oder treten Sie einem bestehenden bei.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {households.map((household: any) => (
                  <Card
                    key={household.householdId}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectHousehold(household.householdId)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-lg">{household.householdName}</h3>
                        <p className="text-sm text-gray-600">
                          {t("householdSelection.memberAs", "Als")}: {household.memberName} • {household.role}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        {t("householdSelection.select", "Auswählen")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Code Dialog */}
      {createdHousehold && (
        <InviteCodeDialog
          open={inviteCodeDialogOpen}
          onOpenChange={setInviteCodeDialogOpen}
          inviteCode={createdHousehold.inviteCode}
          householdName={createdHousehold.name}
        />
      )}

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </div>
  );
}

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
import { Home, Plus, LogIn, Users, User, Settings, Backpack, Pencil, Download, Share2, Trash2, Copy, Check, Link2, X } from "lucide-react";
import { Link } from "wouter";
import { InviteCodeDialog } from "@/components/InviteCodeDialog";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HouseholdSelection() {
  const [, setLocation] = useLocation();
  const { setCurrentHousehold, token, user: authUser, isLoading: authLoading } = useUserAuth();
  const { t } = useTranslation(["auth", "common", "plankiste"]);
  const [currentLang, setCurrentLang] = useState<SupportedLanguageCode>(getCurrentLanguage());

  // Haushalt-Dialoge
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeDialogOpen, setInviteCodeDialogOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [newHouseholdLanguage, setNewHouseholdLanguage] = useState<SupportedLanguageCode>(getCurrentLanguage());
  const [createdHousehold, setCreatedHousehold] = useState<{ name: string; inviteCode: string } | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Plansack State
  const [editBagItem, setEditBagItem] = useState<{ id: number; name: string; description: string } | null>(null);
  const [deleteBagId, setDeleteBagId] = useState<number | null>(null);
  const [importBagId, setImportBagId] = useState<number | null>(null);
  const [importHouseholdId, setImportHouseholdId] = useState<string>("");
  const [shareBagItem, setShareBagItem] = useState<{ id: number; name: string } | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const utils = trpc.useUtils();

  const currentUser = authUser;
  const userLoading = authLoading;

  const { data: households, refetch: refetchHouseholds } = trpc.householdManagement.listUserHouseholds.useQuery(
    { userId: currentUser?.id },
    { enabled: !!currentUser?.id && currentUser.id > 0 }
  );

  const { data: bagItems = [] } = trpc.planBag.listBag.useQuery(
    undefined,
    { enabled: !!currentUser?.id && currentUser.id > 0 }
  );

  // Haushalt-Mutations
  const createHouseholdMutation = trpc.householdManagement.createHousehold.useMutation({
    onSuccess: (data: any) => {
      setCreatedHousehold({ name: data.household.name, inviteCode: data.household.inviteCode });
      setCreateDialogOpen(false);
      setNewHouseholdName("");
      setInviteCodeDialogOpen(true);
      refetchHouseholds();
    },
    onError: (error: any) => {
      toast.error(error.message || t("householdSelection.createError", "Fehler beim Erstellen des Haushalts"));
    },
  });

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

  // Plansack-Mutations
  const updateMetaMutation = trpc.planBag.updateMeta.useMutation({
    onSuccess: () => { utils.planBag.listBag.invalidate(); toast.success(t("common:saved", "Gespeichert")); setEditBagItem(null); },
    onError: () => toast.error(t("common:error", "Fehler")),
  });
  const removeBagMutation = trpc.planBag.removeFromBag.useMutation({
    onSuccess: () => { utils.planBag.listBag.invalidate(); toast.success(t("common:deleted", "Gelöscht")); setDeleteBagId(null); },
    onError: () => toast.error(t("common:error", "Fehler")),
  });
  const importBagMutation = trpc.planBag.importFromBag.useMutation({
    onSuccess: () => { toast.success(t("plankiste:plansack.imported", "Importiert")); setImportBagId(null); setImportHouseholdId(""); },
    onError: () => toast.error(t("common:error", "Fehler")),
  });
  const shareMutation = trpc.planBag.createShareLink.useMutation({
    onSuccess: (data) => setShareToken(data.token),
    onError: () => toast.error(t("common:error", "Fehler")),
  });
  const deleteShareMutation = trpc.planBag.deleteShareLink.useMutation({
    onSuccess: () => { utils.planBag.listBag.invalidate(); toast.success(t("common:deleted", "Gelöscht")); },
    onError: () => toast.error(t("common:error", "Fehler")),
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/plan/${token}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleCreateHousehold = () => {
    if (!newHouseholdName.trim()) {
      toast.error(t("householdSelection.enterHouseholdName", "Bitte geben Sie einen Haushaltsnamen ein."));
      return;
    }
    createHouseholdMutation.mutate({ householdName: newHouseholdName.trim(), language: newHouseholdLanguage } as any);
  };

  const handleJoinHousehold = () => {
    if (!inviteCode.trim()) {
      toast.error(t("householdSelection.enterInviteCode", "Bitte geben Sie einen Einladungscode ein."));
      return;
    }
    joinHouseholdMutation.mutate({ inviteCode: inviteCode.trim() } as any);
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

  if (!token) { setLocation("/login"); return null; }

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
      {/* Sprach-Buttons */}
      <div className="fixed top-4 right-4 flex items-center gap-1">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button key={lang.code} onClick={() => handleLanguageChange(lang.code)} title={lang.name}
            className={`text-xl leading-none rounded-md px-1.5 py-1 transition-all ${
              currentLang === lang.code ? "ring-2 ring-blue-500 bg-white/80 shadow-sm scale-110" : "opacity-60 hover:opacity-100 hover:bg-white/60"
            }`}>
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
          {/* Profil-Karte */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                  {(currentUser as any).profileImageUrl ? (
                    <img src={(currentUser as any).profileImageUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentUser.name}</h3>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setProfileDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                {t("householdSelection.editProfile", "Profil bearbeiten")}
              </Button>
            </CardContent>
          </Card>

          {/* Aktions-Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("householdSelection.createNew", "Neuen Haushalt erstellen")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("householdSelection.createNew", "Neuen Haushalt erstellen")}</DialogTitle>
                  <DialogDescription>
                    {t("householdSelection.createDescription", "Geben Sie einen Namen für Ihren neuen Haushalt ein.")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="householdName">{t("householdSelection.householdName", "Haushaltsname")}</Label>
                    <Input id="householdName" placeholder={t("householdSelection.householdNamePlaceholder", "z.B. Familie Müller")}
                      value={newHouseholdName} onChange={(e) => setNewHouseholdName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common:household.language", "Haushaltssprache")}</Label>
                    <p className="text-xs text-muted-foreground">{t("common:household.languageHint")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button key={lang.code} type="button" onClick={() => setNewHouseholdLanguage(lang.code)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all ${
                            newHouseholdLanguage === lang.code ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-primary/50"
                          }`}>
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateHousehold} disabled={createHouseholdMutation.isPending} className="w-full">
                    {createHouseholdMutation.isPending ? t("householdSelection.creating", "Erstelle...") : t("householdSelection.createButton", "Haushalt erstellen")}
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
                    <Input id="inviteCode" placeholder={t("householdSelection.inviteCodePlaceholder", "z.B. ABC123XYZ")}
                      value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} />
                  </div>
                  <Button onClick={handleJoinHousehold} disabled={joinHouseholdMutation.isPending} className="w-full">
                    {joinHouseholdMutation.isPending ? t("householdSelection.joining", "Trete bei...") : t("householdSelection.joinButton", "Beitreten")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Haushalts-Liste */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span className="font-medium">{t("householdSelection.yourHouseholds", "Ihre Haushalte")}</span>
            </div>
            {!households || households.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">{t("householdSelection.noHouseholds", "Sie sind noch keinem Haushalt zugeordnet.")}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("householdSelection.noHouseholdsHint", "Erstellen Sie einen neuen Haushalt oder treten Sie einem bestehenden bei.")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {households.map((household: any) => (
                  <Card key={household.householdId} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectHousehold(household.householdId)}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-lg">{household.householdName}</h3>
                        <p className="text-sm text-gray-600">
                          {t("householdSelection.memberAs", "Als")}: {household.memberName} • {household.role}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">{t("householdSelection.select", "Auswählen")}</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ─── Plansack-Sektion ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Backpack className="h-4 w-4 text-violet-600" />
              <span className="font-medium text-violet-700">{t("plankiste:plansack.title", "Plansack")}</span>
              <span className="text-xs text-gray-400">({(bagItems as any[]).length})</span>
            </div>
            {(bagItems as any[]).length === 0 ? (
              <Card className="border-dashed border-violet-200">
                <CardContent className="flex flex-col items-center justify-center py-5 text-center">
                  <Backpack className="h-8 w-8 text-violet-300 mb-2" />
                  <p className="text-sm text-gray-500">{t("plankiste:plansack.empty", "Dein Plansack ist leer")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("plankiste:plansack.emptyHint", "Öffne die Plankiste und packe Vorlagen in deinen Plansack")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(bagItems as any[]).map((item: any) => {
                  const snapshot = item.snapshot as any;
                  const shares = item.shares ?? [];
                  return (
                    <Card key={item.id} className="border-violet-100 hover:border-violet-300 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Backpack className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{snapshot?.name ?? "?"}</p>
                            {snapshot?.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{snapshot.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                            {shares.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {shares.map((share: any) => (
                                  <div key={share.id} className="flex items-center gap-1.5 text-xs bg-violet-50 rounded px-2 py-1">
                                    <Link2 className="w-3 h-3 text-violet-500 flex-shrink-0" />
                                    <span className="flex-1 truncate font-mono text-gray-500 text-[10px]">
                                      {`${window.location.origin}/share/plan/${share.token}`}
                                    </span>
                                    <button onClick={() => handleCopyLink(share.token)} className="text-gray-400 hover:text-violet-600">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteShareMutation.mutate({ shareId: share.id })} className="text-gray-400 hover:text-red-500">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => setEditBagItem({ id: item.id, name: snapshot?.name ?? "", description: snapshot?.description ?? "" })}>
                              <Pencil className="w-3 h-3 mr-1" />{t("common:edit", "Bearbeiten")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-violet-700 hover:text-violet-900"
                              onClick={() => { setImportBagId(item.id); setImportHouseholdId(""); }}>
                              <Download className="w-3 h-3 mr-1" />{t("plankiste:plansack.import", "Importieren")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => { setShareBagItem({ id: item.id, name: snapshot?.name ?? "" }); setShareToken(null); }}>
                              <Share2 className="w-3 h-3 mr-1" />{t("plankiste:plansack.share", "Teilen")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                              onClick={() => setDeleteBagId(item.id)}>
                              <Trash2 className="w-3 h-3 mr-1" />{t("plankiste:plansack.remove", "Entfernen")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Code Dialog */}
      {createdHousehold && (
        <InviteCodeDialog open={inviteCodeDialogOpen} onOpenChange={setInviteCodeDialogOpen}
          inviteCode={createdHousehold.inviteCode} householdName={createdHousehold.name} />
      )}

      {/* User Profile Dialog */}
      <UserProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />

      {/* ─── Plansack Dialoge ─────────────────────────────────────── */}

      {/* Bearbeiten */}
      <Dialog open={editBagItem !== null} onOpenChange={open => { if (!open) setEditBagItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plankiste:plansack.editTitle", "Vorlage bearbeiten")}</DialogTitle>
          </DialogHeader>
          {editBagItem && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t("common:name", "Name")}</Label>
                <Input value={editBagItem.name} onChange={e => setEditBagItem(prev => prev ? { ...prev, name: e.target.value } : null)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common:description", "Beschreibung")}</Label>
                <Textarea value={editBagItem.description} onChange={e => setEditBagItem(prev => prev ? { ...prev, description: e.target.value } : null)} rows={3} maxLength={1000} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditBagItem(null)}>{t("common:cancel", "Abbrechen")}</Button>
                <Button onClick={() => updateMetaMutation.mutate({ bagItemId: editBagItem.id, name: editBagItem.name, description: editBagItem.description })}
                  disabled={updateMetaMutation.isPending || !editBagItem.name.trim()}>
                  {t("common:save", "Speichern")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importBagId !== null} onOpenChange={open => { if (!open) { setImportBagId(null); setImportHouseholdId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plankiste:plansack.importTitle", "Vorlage importieren")}</DialogTitle>
            <DialogDescription>{t("plankiste:plansack.importDesc", "Die Vorlage wird als neue Vorlage in den gewählten Haushalt importiert.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("householdSelection.yourHouseholds", "Haushalt auswählen")}</Label>
              {households && (households as any[]).length > 0 ? (
                <Select value={importHouseholdId} onValueChange={setImportHouseholdId}>
                  <SelectTrigger><SelectValue placeholder={t("householdSelection.select", "Haushalt wählen...")} /></SelectTrigger>
                  <SelectContent>
                    {(households as any[]).map((h: any) => (
                      <SelectItem key={h.householdId} value={String(h.householdId)}>
                        {h.householdName} ({h.memberName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{t("householdSelection.noHouseholds", "Keine Haushalte vorhanden")}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setImportBagId(null); setImportHouseholdId(""); }}>{t("common:cancel", "Abbrechen")}</Button>
              <Button disabled={!importHouseholdId || importBagMutation.isPending}
                onClick={() => {
                  if (!importBagId || !importHouseholdId) return;
                  const hId = Number(importHouseholdId);
                  const hh = (households as any[])?.find((h: any) => h.householdId === hId);
                  importBagMutation.mutate({ bagItemId: importBagId, householdId: hId, memberId: hh?.memberId ?? 0 });
                }}>
                <Download className="w-4 h-4 mr-2" />{t("plankiste:plansack.import", "Importieren")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Löschen */}
      <AlertDialog open={deleteBagId !== null} onOpenChange={open => { if (!open) setDeleteBagId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plankiste:plansack.removeTitle", "Aus Plansack entfernen?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("plankiste:plansack.removeDesc", "Der Eintrag wird gelöscht. Bestehende Teilungs-Links werden ebenfalls gelöscht.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel", "Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBagId && removeBagMutation.mutate({ bagItemId: deleteBagId })}
              disabled={removeBagMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />{t("plankiste:plansack.remove", "Entfernen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Teilen */}
      <Dialog open={shareBagItem !== null} onOpenChange={open => { if (!open) { setShareBagItem(null); setShareToken(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plankiste:plansack.shareTitle", "Vorlage teilen")}</DialogTitle>
            <DialogDescription>
              {shareBagItem && t("plankiste:plansack.shareDesc", "Erstelle einen Teilungs-Link für \"{{name}}\"", { name: shareBagItem.name })}
            </DialogDescription>
          </DialogHeader>
          {shareToken ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("plankiste:plansack.shareLinkReady", "Dein Teilungs-Link ist bereit:")}</p>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <span className="flex-1 text-xs font-mono break-all">{`${window.location.origin}/share/plan/${shareToken}`}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0" onClick={() => handleCopyLink(shareToken)}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("plankiste:plansack.shareCreateHint", "Klicke auf 'Link erstellen', um einen kopierbaren Link zu generieren.")}</p>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setShareBagItem(null); setShareToken(null); }}>{t("common:close", "Schließen")}</Button>
            {!shareToken && (
              <Button onClick={() => shareBagItem && shareMutation.mutate({ bagItemId: shareBagItem.id })} disabled={shareMutation.isPending}>
                <Share2 className="w-4 h-4 mr-2" />{t("plankiste:plansack.createLink", "Link erstellen")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legal Footer */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors underline-offset-2 hover:underline">
            {t("common:legal.privacy", "Datenschutz")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/imprint" className="hover:text-gray-600 transition-colors underline-offset-2 hover:underline">
            {t("common:legal.imprint", "Impressum")}
          </Link>
        </div>
      </div>
    </div>
  );
}

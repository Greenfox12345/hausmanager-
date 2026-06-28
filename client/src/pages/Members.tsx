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
import {
  ArrowLeft, Users, LogOut, Plus, Copy, Check, Globe, Home, Lock,
  DoorOpen, Trash2, Vote, Undo2, Crown, Link2, UserX, ExternalLink,
  Pencil, X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage, type SupportedLanguageCode } from "@/lib/i18n";

export default function Members() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated, isDemoSession: isDemoUser, logout } = useCompatAuth();
  const { currentHousehold, setCurrentHousehold } = useUserAuth();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ id: number; name: string } | null>(null);
  const [inviteLinkData, setInviteLinkData] = useState<{ link: string; memberName: string } | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: number; name: string } | null>(null);

  // Inline rename state: memberId → draft name
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Add placeholder member state
  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
  const [newPlaceholderName, setNewPlaceholderName] = useState("");

  // Rename household state
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdNameDraft, setHouseholdNameDraft] = useState("");

  const { t, i18n } = useTranslation(["members", "common"]);
  const currentUiLang = getCurrentLanguage();

  const householdId = currentHousehold?.householdId;

  const addPlaceholderMutation = trpc.householdManagement.addPlaceholderMember.useMutation({
    onSuccess: () => {
      refetchMembers();
      setNewPlaceholderName("");
      setShowAddPlaceholder(false);
      toast.success(t("members:messages.memberAdded"));
    },
    onError: () => toast.error(t("members:messages.addError")),
  });

  const { data: members = [], isLoading, refetch: refetchMembers } = trpc.household.getHouseholdMembers.useQuery(
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

  const renameHouseholdMutation = trpc.householdManagement.renameHousehold.useMutation({
    onSuccess: (data) => {
      toast.success(t("members:household.renameSuccess"));
      setEditingHouseholdName(false);
      // Update household name in context
      if (currentHousehold) {
        setCurrentHousehold({ ...currentHousehold, householdName: data.name });
      }
      refetchSettings();
    },
    onError: () => {
      toast.error(t("members:messages.householdNameSaveError"));
    },
  });

  const updateLanguageMutation = trpc.householdManagement.updateHouseholdLanguage.useMutation({
    onSuccess: () => {
      toast.success(t("common:household.settings.saved"));
      refetchSettings();
    },
    onError: () => {
      toast.error(t("members:messages.settingsSaveError"));
    },
  });

  // Leave household mutation
  const leaveHouseholdMutation = trpc.householdManagement.leaveHousehold.useMutation({
    onSuccess: (data) => {
      if (data.dissolved) {
        toast.success(t("members:household.dissolvedAfterLeave"));
      } else if (data.newAdminName) {
        toast.success(t("members:household.leftWithNewAdmin", { name: data.newAdminName }));
      } else {
        toast.success(t("members:household.leftSuccess"));
      }
      logout();
      setLocation("/household-selection");
    },
    onError: () => {
      toast.error(t("members:messages.leaveError"));
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
    onError: () => {
      toast.error(t("members:messages.dissolveError"));
    },
  });

  // Generate member invite link mutation
  const generateInviteLinkMutation = trpc.householdManagement.generateMemberInviteLink.useMutation({
    onSuccess: (data) => {
      setInviteLinkData({ link: data.inviteLink, memberName: data.memberName });
    },
    onError: () => {
      toast.error(t("members:messages.inviteLinkError"));
    },
  });

  // Kick (delete) unregistered member mutation
  const kickMemberMutation = trpc.householdManagement.kickMember.useMutation({
    onSuccess: (data) => {
      toast.success(t("members:messages.memberRemoved", { name: data.memberName }));
      setKickTarget(null);
      refetchMembers();
      refetchSettings();
    },
    onError: () => {
      toast.error(t("members:messages.removeError"));
      setKickTarget(null);
    },
  });

  // Rename member mutation
  const renameMemberMutation = trpc.householdManagement.renameMember.useMutation({
    onSuccess: (data) => {
      toast.success(t("members:messages.memberRenamed", { name: data.newName }));
      setEditingMemberId(null);
      setEditingName("");
      refetchMembers();
      // If the renamed member is the current user's own slot, update context
      if (currentHousehold && data.memberId === currentHousehold.memberId) {
        setCurrentHousehold({ ...currentHousehold, memberName: data.newName });
        // Keep demo_owner_name in sync so the registration form shows the updated name
        if (isDemoUser && localStorage.getItem("demo_owner_name") !== null) {
          localStorage.setItem("demo_owner_name", data.newName);
        }
      }
    },
    onError: () => {
      toast.error(t("members:messages.renameError"));
    },
  });

  // Transfer admin mutation
  const transferAdminMutation = trpc.householdManagement.transferAdmin.useMutation({
    onSuccess: (data) => {
      toast.success(t("members:household.adminTransferred", { name: data.newAdminName }));
      refetchSettings();
      setTransferTarget(null);
    },
    onError: () => {
      toast.error(t("members:messages.transferError"));
    },
  });

  // Retract dissolve vote mutation
  const retractVoteMutation = trpc.householdManagement.retractDissolveVote.useMutation({
    onSuccess: () => {
      toast.success(t("members:household.voteRetracted"));
      refetchDissolveStatus();
    },
    onError: () => {
      toast.error(t("members:messages.retractVoteError"));
    },
  });

  // Focus input when edit mode opens
  useEffect(() => {
    if (editingMemberId !== null) {
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editingMemberId]);

  const currentHouseholdLang = settings?.language || "de";
  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentHouseholdLang);

  const handleHouseholdLanguageChange = (code: SupportedLanguageCode) => {
    if (!householdId) return;
    updateLanguageMutation.mutate({ householdId, language: code });
  };

  const handleCopyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      toast.success(t("members:messages.inviteLinkCopied"));
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch {
      toast.error(t("common:messages.copyError"));
    }
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

  const startEditing = (id: number, currentName: string) => {
    setEditingMemberId(id);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditingName("");
  };

  const commitRename = (memberId: number) => {
    const trimmed = editingName.trim();
    if (!trimmed || !householdId) return;
    renameMemberMutation.mutate({ householdId, memberId, newName: trimmed });
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, memberId: number) => {
    if (e.key === "Enter") commitRename(memberId);
    if (e.key === "Escape") cancelEditing();
  };

  // A member is editable when:
  // - it is unregistered (userId === null), OR
  // - it is the current user's own slot (registered users can rename themselves)
  // AND the current user is either a demo user or the admin
  const canEditMember = (m: { id: number; userId: number | null }) => {
    if (isDemoUser) {
      // Demo users can rename all unregistered members (all slots are unregistered in demo)
      return m.userId === null;
    }
    // Registered users: own slot always editable; other unregistered slots only if admin
    const isOwnSlot = m.id === member?.memberId;
    const isAdmin = settings?.isAdmin;
    return isOwnSlot || (isAdmin && m.userId === null);
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
                {/* Registered members */}
                {members.filter((m) => m.userId !== null).length > 0 && members.filter((m) => m.userId === null).length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 pt-1">
                    Registrierte Mitglieder
                  </p>
                )}
                {members.filter((m) => m.userId !== null).map((m) => (
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
                    <div className="flex-1 min-w-0">
                      {/* Inline edit for own registered slot */}
                      {editingMemberId === m.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={editInputRef}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleRenameKeyDown(e, m.id)}
                            maxLength={50}
                            className="h-8 text-sm font-semibold"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            disabled={renameMemberMutation.isPending}
                            onClick={() => commitRename(m.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          {m.memberName}
                          {m.userId === settings?.adminUserId && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                              <Crown className="h-3 w-3" />
                              {t("members:admin")}
                            </span>
                          )}
                          {m.id === member?.memberId && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              Du
                            </span>
                          )}
                          {/* Edit own name button for registered users */}
                          {canEditMember(m) && (
                            <button
                              type="button"
                              onClick={() => startEditing(m.id, m.memberName)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Namen ändern"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                      {editingMemberId !== m.id && (
                        <div className="text-sm text-muted-foreground">
                          {m.isActive ? t("common:status.active") : t("common:status.inactive")}
                        </div>
                      )}
                    </div>
                    {settings?.isAdmin && m.userId !== null && m.userId !== settings?.adminUserId && m.isActive && editingMemberId !== m.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        onClick={() => setTransferTarget({ id: m.id, name: m.memberName })}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        {t("members:household.makeAdmin")}
                      </Button>
                    )}
                  </div>
                ))}

                {/* Unregistered (placeholder) members – visually distinct */}
                {(members.filter((m) => m.userId === null).length > 0 || (settings?.isAdmin || isDemoUser)) && (
                  <>
                    {members.filter((m) => m.userId !== null).length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <div className="h-px flex-1 bg-border" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                          Nicht registriert
                        </p>
                        {(settings?.isAdmin || isDemoUser) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
                            onClick={() => setShowAddPlaceholder((v) => !v)}
                          >
                            <Plus className="h-3 w-3" />
                            Hinzufügen
                          </Button>
                        )}
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {members.filter((m) => m.userId !== null).length === 0 && (settings?.isAdmin || isDemoUser) && (
                      <div className="flex justify-end mb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => setShowAddPlaceholder((v) => !v)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Mitbewohner hinzufügen
                        </Button>
                      </div>
                    )}
                    {showAddPlaceholder && (
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={newPlaceholderName}
                          onChange={(e) => setNewPlaceholderName(e.target.value)}
                          placeholder="Name des Mitbewohners"
                          className="h-8 text-sm flex-1"
                          maxLength={50}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newPlaceholderName.trim()) {
                              addPlaceholderMutation.mutate({ householdId: household!.householdId, memberName: newPlaceholderName.trim() });
                            }
                            if (e.key === "Escape") { setShowAddPlaceholder(false); setNewPlaceholderName(""); }
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 gap-1"
                          disabled={!newPlaceholderName.trim() || addPlaceholderMutation.isPending}
                          onClick={() => addPlaceholderMutation.mutate({ householdId: household!.householdId, memberName: newPlaceholderName.trim() })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => { setShowAddPlaceholder(false); setNewPlaceholderName(""); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {members.filter((m) => m.userId === null).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-800/40 transition-all"
                      >
                        <Avatar className="h-12 w-12 opacity-80">
                          <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold">
                            {getInitials(editingMemberId === m.id ? editingName || m.memberName : m.memberName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {editingMemberId === m.id ? (
                            /* ── Inline edit mode ── */
                            <div className="flex items-center gap-2">
                              <Input
                                ref={editInputRef}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => handleRenameKeyDown(e, m.id)}
                                maxLength={50}
                                className="h-8 text-sm font-semibold border-amber-300 focus-visible:ring-amber-400"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                disabled={renameMemberMutation.isPending}
                                onClick={() => commitRename(m.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            /* ── Display mode ── */
                            <div className="font-semibold flex items-center gap-2 flex-wrap">
                              {m.memberName}
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                                Platzhalter
                              </span>
                              {m.id === member?.memberId && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  Du
                                </span>
                              )}
                              {/* Edit button – shown for demo users and admins */}
                              {canEditMember(m) && (
                                <button
                                  type="button"
                                  onClick={() => startEditing(m.id, m.memberName)}
                                  className="text-amber-500 hover:text-amber-700 transition-colors"
                                  title="Namen ändern"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          {editingMemberId !== m.id && (
                            <div className="text-sm text-muted-foreground">
                              Noch nicht registriert
                            </div>
                          )}
                        </div>
                        {/* Action buttons – only shown when not in edit mode.
                             Demo users can remove any slot except their own (Slot 0). */}
                        {(settings?.isAdmin || isDemoUser) && editingMemberId !== m.id && m.id !== member?.memberId && (
                          <div className="flex items-center gap-1 shrink-0">
                            {!isDemoUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                disabled={generateInviteLinkMutation.isPending}
                                onClick={() =>
                                  householdId &&
                                  generateInviteLinkMutation.mutate({ householdId, memberId: m.id })
                                }
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                Einladen
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setKickTarget({ id: m.id, name: m.memberName })}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Entfernen
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Invite Card – hidden in demo mode */}
        {!isDemoUser && (
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
        )}

        {/* Household Name Card */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-5 w-5" />
              {t("members:household.renameTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings?.isAdmin ? (
              editingHouseholdName ? (
                <div className="flex gap-2">
                  <Input
                    value={householdNameDraft}
                    onChange={(e) => setHouseholdNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (householdNameDraft.trim() && householdId) {
                          renameHouseholdMutation.mutate({ householdId, name: householdNameDraft.trim() });
                        }
                      } else if (e.key === "Escape") {
                        setEditingHouseholdName(false);
                      }
                    }}
                    placeholder={currentHousehold?.householdName || ""}
                    maxLength={100}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (householdNameDraft.trim() && householdId) {
                        renameHouseholdMutation.mutate({ householdId, name: householdNameDraft.trim() });
                      }
                    }}
                    disabled={!householdNameDraft.trim() || renameHouseholdMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingHouseholdName(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{currentHousehold?.householdName}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHouseholdNameDraft(currentHousehold?.householdName || "");
                      setEditingHouseholdName(true);
                    }}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common:actions.edit")}
                  </Button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm">{currentHousehold?.householdName}</p>
                  <p className="text-xs mt-1">{t("common:household.adminOnly")}</p>
                </div>
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
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={i18n.language?.startsWith(lang.code) ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeLanguage(lang.code as SupportedLanguageCode)}
                    className="gap-2"
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {i18n.language?.startsWith(lang.code) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
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

        {/* Danger Zone Card – hidden in demo mode */}
        {!isDemoUser && (
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

                {/* Vote progress bar */}
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
        )}
      </div>

      {/* Transfer Admin Confirmation Dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {t("members:household.transferAdminTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("members:household.transferAdminDescription", { name: transferTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                if (householdId && transferTarget) {
                  transferAdminMutation.mutate({
                    householdId,
                    targetMemberId: transferTarget.id,
                  });
                }
              }}
            >
              <Crown className="h-4 w-4 mr-1.5" />
              {t("members:household.transferAdminConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Link Dialog */}
      {inviteLinkData && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setInviteLinkData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500" />
                Einladungslink für {inviteLinkData.memberName}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dieser Link ist 7 Tage gültig. Die Person kann sich damit registrieren und landet direkt in deinem Haushalt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLinkData.link}
                  className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono truncate"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleCopyInviteLink(inviteLinkData.link)}
                >
                  {inviteLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tipp: Schicke den Link per WhatsApp, E-Mail oder SMS.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInviteLinkData(null)}>{t("common:actions.close", "Schließen")}</AlertDialogCancel>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => window.open(inviteLinkData.link, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Link öffnen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Kick Member Confirmation Dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Mitglied entfernen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du <strong>{kickTarget?.name}</strong> wirklich aus dem Haushalt entfernen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={kickMemberMutation.isPending}
              onClick={() => {
                if (householdId && kickTarget) {
                  kickMemberMutation.mutate({ householdId, memberId: kickTarget.id });
                }
              }}
            >
              <UserX className="h-4 w-4 mr-1.5" />
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </AppLayout>
  );
}

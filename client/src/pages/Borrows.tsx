import { useState, useMemo } from "react";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Package, User, Clock, CheckCircle, XCircle,
  Building2, Search, Home, Globe, HandCoins, PackageCheck, Undo2, ImageIcon
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BorrowRequestDialog } from "@/components/BorrowRequestDialog";
import { PickupDialog, ReturnDialog, type BorrowRequestDetail } from "@/components/BorrowPickupReturnDialogs";

type BorrowStatus = "all" | "pending" | "approved" | "active" | "completed" | "rejected" | "cancelled";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function Borrows() {
  const { t } = useTranslation(["borrows", "common"]);
  const { household, member, isAuthenticated } = useCompatAuth();
  const { isLoading } = trpc.auth.me.useQuery();

  const [myBorrowsStatus, setMyBorrowsStatus] = useState<BorrowStatus>("all");
  const [showPastBorrows, setShowPastBorrows] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<"all" | "internal" | "external">("all");
  const [itemSearch, setItemSearch] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string } | null>(null);

  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedBorrowDetail, setSelectedBorrowDetail] = useState<BorrowRequestDetail | null>(null);

  const utils = trpc.useUtils();

  const { data: pendingForMe = [], isLoading: loadingPending } = trpc.borrow.getPendingForMember.useQuery(
    { householdId: household?.householdId ?? 0, memberId: member?.memberId ?? 0 },
    { enabled: !!household && !!member }
  );

  const { data: myBorrows = [], isLoading: loadingMyBorrows } = trpc.borrow.getMyBorrows.useQuery(
    { householdId: household?.householdId ?? 0, borrowerId: member?.memberId ?? 0 },
    { enabled: !!household && !!member }
  );

  const { data: allItems, isLoading: loadingItems } = trpc.inventory.listAll.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const approveMutation = trpc.borrow.approve.useMutation({
    onSuccess: () => {
      toast.success(t("borrows:messages.approved", "Ausleihe genehmigt"));
      utils.borrow.getPendingForMember.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.borrow.reject.useMutation({
    onSuccess: () => {
      toast.success(t("borrows:messages.rejected", "Ausleihe abgelehnt"));
      setRejectDialogOpen(false);
      setRejectReason("");
      utils.borrow.getPendingForMember.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createBorrowMutation = trpc.borrow.request.useMutation({
    onSuccess: () => {
      toast.success(t("borrows:messages.requestSent", "Ausleih-Anfrage gesendet"));
      setBorrowDialogOpen(false);
      setSelectedItem(null);
      utils.borrow.getMyBorrows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredPending = useMemo(() => {
    const base = pendingForMe as any[];
    if (pendingFilter === "internal") return base.filter((r: any) => !r.isExternal);
    if (pendingFilter === "external") return base.filter((r: any) => r.isExternal);
    return base;
  }, [pendingForMe, pendingFilter]);

  const filteredMyBorrows = useMemo(() => {
    const now = new Date();
    let filtered = myBorrowsStatus === "all" ? myBorrows : myBorrows.filter(b => b.status === myBorrowsStatus);
    if (!showPastBorrows) {
      filtered = filtered.filter(b => {
        const end = b.endDate ? new Date(b.endDate) : null;
        // Vergangen = Enddatum überschritten UND Status abgeschlossen oder abgelehnt
        const isPast = b.status === 'cancelled' || (end && end < now && (b.status === 'completed' || b.status === 'rejected'));
        return !isPast;
      });
    }
    return [...filtered].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [myBorrows, myBorrowsStatus, showPastBorrows]);

  const ownItems = useMemo(() => {
    if (!allItems?.own) return [];
    const q = itemSearch.toLowerCase();
    return allItems.own.filter(item => !q || item.name.toLowerCase().includes(q));
  }, [allItems, itemSearch]);

  const sharedItems = useMemo(() => {
    if (!allItems?.shared) return [];
    const q = itemSearch.toLowerCase();
    return allItems.shared.filter(item => !q || item.name.toLowerCase().includes(q));
  }, [allItems, itemSearch]);

  const sharedByHousehold = useMemo(() => {
    const groups: Record<string, { householdName: string; items: typeof sharedItems }> = {};
    for (const item of sharedItems) {
      const key = String(item.householdId);
      if (!groups[key]) groups[key] = { householdName: item.householdName ?? "Unbekannt", items: [] };
      groups[key].items.push(item);
    }
    return Object.values(groups);
  }, [sharedItems]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">{t("common:loading", "Laden...")}</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !household || !member) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">{t("common:pleaseLogin", "Bitte anmelden")}</p>
        </div>
      </AppLayout>
    );
  }

  const handleApprove = (requestId: number) => {
    approveMutation.mutate({ requestId, approverId: member.memberId });
  };

  const handleRejectOpen = (requestId: number) => {
    setSelectedRequestId(requestId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequestId) return;
    rejectMutation.mutate({
      requestId: selectedRequestId,
      approverId: member.memberId,
      responseMessage: rejectReason || undefined,
    });
  };

  const handleBorrowRequest = (item: { id: number; name: string }) => {
    setSelectedItem(item);
    setBorrowDialogOpen(true);
  };

  const handleBorrowSubmit = (data: { startDate: Date; endDate: Date; message?: string }) => {
    if (!selectedItem || !member || !household) return;
    createBorrowMutation.mutate({
      inventoryItemId: selectedItem.id,
      borrowerMemberId: member.memberId,
      borrowerHouseholdId: household.householdId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
      requestMessage: data.message,
    });
  };

  const handleOpenPickup = (borrow: any) => {
    setSelectedBorrowDetail({
      id: borrow.id,
      status: borrow.status,
      itemName: borrow.itemName,
      itemPhotoUrl: borrow.itemPhotoUrl ?? null,
      itemDescription: borrow.itemDescription ?? null,
      borrowerName: borrow.borrowerName ?? "",
      startDate: borrow.startDate,
      endDate: borrow.endDate,
      requestMessage: borrow.requestMessage ?? null,
      pickupComment: borrow.pickupComment ?? null,
      pickupPhotoUrl: borrow.pickupPhotoUrl ?? null,
      guideline: borrow.guideline ?? null,
    });
    setPickupDialogOpen(true);
  };

  const handleOpenReturn = (borrow: any) => {
    setSelectedBorrowDetail({
      id: borrow.id,
      status: borrow.status,
      itemName: borrow.itemName,
      itemPhotoUrl: borrow.itemPhotoUrl ?? null,
      itemDescription: borrow.itemDescription ?? null,
      borrowerName: borrow.borrowerName ?? "",
      startDate: borrow.startDate,
      endDate: borrow.endDate,
      requestMessage: borrow.requestMessage ?? null,
      pickupComment: borrow.pickupComment ?? null,
      pickupPhotoUrl: borrow.pickupPhotoUrl ?? null,
      guideline: borrow.guideline ?? null,
    });
    setReturnDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 pb-24 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <HandCoins className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">{t("borrows:title", "Ausleihen")}</h1>
        </div>

        {/* ── Anfragen-Sektion (immer sichtbar, oben) ── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{t("borrows:tabRequests", "Anfragen verwalten")}</h2>
              {filteredPending.length > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                  {filteredPending.length}
                </Badge>
              )}
            </div>
            <Select value={pendingFilter} onValueChange={(v) => setPendingFilter(v as typeof pendingFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("borrows:filterAll", "Alle Anfragen")}</SelectItem>
                <SelectItem value="internal">{t("borrows:filterInternal", "Haushaltsintern")}</SelectItem>
                <SelectItem value="external">{t("borrows:filterExternal", "Externe Haushalte")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingPending ? (
            <p className="text-sm text-muted-foreground">{t("common:loading", "Laden...")}</p>
          ) : filteredPending.length === 0 ? (
            <Card>
              <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm">{t("borrows:noPending", "Keine ausstehenden Anfragen")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((req: any) => (
                <Card key={req.id} className={req.isExternal ? "border-amber-400 dark:border-amber-600" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{req.itemName}</CardTitle>
                          {req.isExternal && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              {t("borrows:externalHousehold", "Externer Haushalt")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          <User className="w-3 h-3 inline mr-1" />
                          {req.borrowerName}
                          {req.isExternal && req.borrowerHouseholdName && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              ({req.borrowerHouseholdName})
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge className={statusColors["pending"]}>
                        {t("borrows:status.pending", "Ausstehend")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{t("borrows:fields.startDate", "Von")}: {formatDate(req.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{t("borrows:fields.endDate", "Bis")}: {formatDate(req.endDate)}</span>
                      </div>
                    </div>
                    {req.message && (
                      <p className="text-sm text-muted-foreground italic mb-3">"{req.message}"</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t("borrows:approval.approve", "Genehmigen")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectOpen(req.id)}
                        disabled={rejectMutation.isPending}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t("borrows:approval.reject", "Ablehnen")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* ── Sub-Tabs: Gegenstände & Meine Ausleihen ── */}
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="items">
              <Package className="w-4 h-4 mr-2" />
              {t("borrows:tabItems", "Anfragbare Gegenstände")}
            </TabsTrigger>
            <TabsTrigger value="myborrows">
              <Clock className="w-4 h-4 mr-2" />
              {t("borrows:tabMyBorrows", "Meine Ausleihen")}
            </TabsTrigger>
          </TabsList>

          {/* ── Items ── */}
          <TabsContent value="items">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("borrows:searchItems", "Gegenstände suchen...")}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingItems ? (
              <p className="text-muted-foreground text-center py-8">{t("common:loading", "Laden...")}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{t("borrows:ownHousehold", "Eigener Haushalt")}</h3>
                    <Badge variant="secondary">{ownItems.length}</Badge>
                  </div>
                  {ownItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">{t("borrows:noItems", "Keine Gegenstände gefunden")}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ownItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                {item.categoryName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.categoryName}</p>
                                )}
                                {item.details && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.details}</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBorrowRequest({ id: item.id, name: item.name })}
                                className="shrink-0"
                              >
                                {t("borrows:requestBorrow", "Anfragen")}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {sharedByHousehold.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold">{t("borrows:otherHouseholds", "Andere Haushalte")}</h3>
                    </div>
                    <div className="space-y-4">
                      {sharedByHousehold.map((group) => (
                        <div key={group.householdName}>
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">{group.householdName}</p>
                            <Badge variant="outline" className="text-xs">{group.items.length}</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-5">
                            {group.items.map((item) => (
                              <Card key={item.id} className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{item.name}</p>
                                      {item.categoryName && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{item.categoryName}</p>
                                      )}
                                      {item.details && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.details}</p>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBorrowRequest({ id: item.id, name: item.name })}
                                      className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    >
                                      {t("borrows:requestBorrow", "Anfragen")}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ownItems.length === 0 && sharedByHousehold.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">{t("borrows:noItemsAtAll", "Keine anfragbaren Gegenstände gefunden")}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── My Borrows ── */}
          <TabsContent value="myborrows">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Select value={myBorrowsStatus} onValueChange={(v) => setMyBorrowsStatus(v as BorrowStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("borrows:filterStatus", "Status filtern")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("borrows:allStatuses", "Alle Status")}</SelectItem>
                  <SelectItem value="pending">{t("borrows:status.pending", "Ausstehend")}</SelectItem>
                  <SelectItem value="approved">{t("borrows:status.approved", "Genehmigt")}</SelectItem>
                  <SelectItem value="active">{t("borrows:status.active", "Aktiv")}</SelectItem>
                  <SelectItem value="completed">{t("borrows:status.completed", "Abgeschlossen")}</SelectItem>
                  <SelectItem value="rejected">{t("borrows:status.rejected", "Abgelehnt")}</SelectItem>
                  <SelectItem value="cancelled">{t("borrows:status.cancelled", "Storniert")}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showPastBorrows ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPastBorrows(v => !v)}
                className="flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                {showPastBorrows
                  ? t("borrows:hidePast", "Vergangene ausblenden")
                  : t("borrows:showPast", "Vergangene anzeigen")}
              </Button>
            </div>
            {loadingMyBorrows ? (
              <p className="text-muted-foreground text-center py-8">{t("common:loading", "Laden...")}</p>
            ) : filteredMyBorrows.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("borrows:noBorrows", "Keine Ausleihen gefunden")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMyBorrows.map((borrow) => (
                  <Card key={borrow.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {(borrow as any).itemPhotoUrl ? (
                              <img
                                src={(borrow as any).itemPhotoUrl}
                                alt={borrow.itemName}
                                className="w-12 h-12 rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{borrow.itemName}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                <User className="w-3 h-3 inline mr-1" />
                                {t("borrows:fields.owner", "Eigentümer")}: {borrow.ownerName}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {borrow.status === "active" && borrow.endDate && new Date(borrow.endDate) < new Date() && (
                            <Badge className="bg-red-600 text-white text-xs">
                              {t("borrows:status.overdue", "Überfällig")}
                            </Badge>
                          )}
                          <Badge className={statusColors[borrow.status] ?? ""}>
                            {t(`borrows:status.${borrow.status}`, borrow.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:fields.startDate", "Von")}: {formatDate(borrow.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:fields.endDate", "Bis")}: {formatDate(borrow.endDate)}</span>
                        </div>
                      </div>

                      {(borrow.status === "active" || borrow.status === "completed") && ((borrow as any).pickupPhotoUrl || (borrow as any).pickupComment) && (
                        <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800 text-sm">
                          <p className="font-medium text-green-700 dark:text-green-400 mb-1">
                            {t("borrows:pickupRecord", "Bei Abholung festgehalten")}
                          </p>
                          {(borrow as any).pickupPhotoUrl && (
                            <img src={(borrow as any).pickupPhotoUrl} alt="Abholung" className="w-full max-h-32 object-cover rounded mb-1" />
                          )}
                          {(borrow as any).pickupComment && (
                            <p className="text-muted-foreground italic">„{(borrow as any).pickupComment}"</p>
                          )}
                        </div>
                      )}

                      {borrow.status === "completed" && ((borrow as any).returnPhotoUrl || (borrow as any).returnComment) && (
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                            {t("borrows:returnRecord", "Bei Rückgabe festgehalten")}
                          </p>
                          {(borrow as any).returnPhotoUrl && (
                            <img src={(borrow as any).returnPhotoUrl} alt="Rückgabe" className="w-full max-h-32 object-cover rounded mb-1" />
                          )}
                          {(borrow as any).returnComment && (
                            <p className="text-muted-foreground italic">„{(borrow as any).returnComment}"</p>
                          )}
                        </div>
                      )}

                      {borrow.status === "pending" && (
                        <p className="text-sm text-muted-foreground">
                          {t("borrows:waitingApproval", "Warte auf Genehmigung")}
                        </p>
                      )}
                      {borrow.status === "approved" && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {t("borrows:approvedPickup", "Genehmigt – bitte abholen")}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPickup(borrow)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <PackageCheck className="w-4 h-4 mr-1" />
                            {t("borrows:confirmPickup", "Abholung bestätigen")}
                          </Button>
                        </div>
                      )}
                      {borrow.status === "active" && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {t("borrows:activeReturn", "Aktiv – bitte zurückgeben")}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleOpenReturn(borrow)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Undo2 className="w-4 h-4 mr-1" />
                            {t("borrows:confirmReturn", "Rückgabe bestätigen")}
                          </Button>
                        </div>
                      )}
                      {borrow.status === "rejected" && borrow.responseMessage && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {t("borrows:rejectedReason", "Abgelehnt")}: {borrow.responseMessage}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("borrows:approval.reject", "Anfrage ablehnen")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("borrows:approval.rejectReason", "Ablehnungsgrund (optional)")}</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("borrows:rejectReasonPlaceholder", "Begründung eingeben...")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common:cancel", "Abbrechen")}
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={rejectMutation.isPending}>
              {t("borrows:approval.reject", "Ablehnen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedItem && (
        <BorrowRequestDialog
          open={borrowDialogOpen}
          onOpenChange={setBorrowDialogOpen}
          itemName={selectedItem.name}
          itemId={selectedItem.id}
          onSubmit={handleBorrowSubmit}
          isSubmitting={createBorrowMutation.isPending}
        />
      )}

      {selectedBorrowDetail && (
        <PickupDialog
          open={pickupDialogOpen}
          onOpenChange={setPickupDialogOpen}
          request={selectedBorrowDetail}
          memberId={member.memberId}
          onSuccess={() => {
            utils.borrow.getMyBorrows.invalidate();
            setSelectedBorrowDetail(null);
          }}
        />
      )}

      {selectedBorrowDetail && (
        <ReturnDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          request={selectedBorrowDetail}
          memberId={member.memberId}
          onSuccess={() => {
            utils.borrow.getMyBorrows.invalidate();
            setSelectedBorrowDetail(null);
          }}
        />
      )}

      <BottomNav />
    </AppLayout>
  );
}

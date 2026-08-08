/**
 * Plansack – Nutzer-eigene Sammlung von Plankiste-Vorlagen
 * Ermöglicht das Speichern, Importieren und Teilen von Vorlagen zwischen Haushalten.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Backpack, Download, RefreshCw, Trash2, Share2, Copy, Check, ShoppingCart, CheckSquare, Layers, FolderKanban, Link2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

type TemplateType = "shopping" | "tasks" | "project" | "mixed";

const TYPE_ICONS: Record<TemplateType, React.ElementType> = {
  shopping: ShoppingCart,
  tasks: CheckSquare,
  project: FolderKanban,
  mixed: Layers,
};

const TYPE_COLORS: Record<TemplateType, string> = {
  shopping: "bg-green-100 text-green-700",
  tasks: "bg-blue-100 text-blue-700",
  project: "bg-purple-100 text-purple-700",
  mixed: "bg-orange-100 text-orange-700",
};

export default function Plansack() {
  const { t } = useTranslation(["plankiste", "common"]);
  const { household, member } = useCompatAuth();
  const householdId = household?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;
  const utils = trpc.useUtils();

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importId, setImportId] = useState<number | null>(null);
  const [shareItem, setShareItem] = useState<{ id: number; name: string } | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: bagItems = [], isLoading } = trpc.planBag.listBag.useQuery();

  const removeMutation = trpc.planBag.removeFromBag.useMutation({
    onSuccess: () => {
      utils.planBag.listBag.invalidate();
      toast.success(t("plankiste:plansack.removed"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("plankiste:plansack.removeError")),
  });

  const importMutation = trpc.planBag.importFromBag.useMutation({
    onSuccess: () => {
      toast.success(t("plankiste:plansack.imported"));
      setImportId(null);
    },
    onError: () => toast.error(t("plankiste:plansack.importError")),
  });

  const shareMutation = trpc.planBag.createShareLink.useMutation({
    onSuccess: (data) => {
      setShareToken(data.token);
    },
    onError: () => toast.error(t("plankiste:plansack.shareError")),
  });

  const deleteShareMutation = trpc.planBag.deleteShareLink.useMutation({
    onSuccess: () => {
      utils.planBag.listBag.invalidate();
      toast.success(t("plankiste:plansack.shareLinkDeleted"));
    },
    onError: () => toast.error(t("plankiste:plansack.shareError")),
  });
  const updateSnapshotMutation = trpc.planBag.updateSnapshot.useMutation({
    onSuccess: () => {
      utils.planBag.listBag.invalidate();
      toast.success(t("plankiste:plansack.updated"));
    },
    onError: () => toast.error(t("plankiste:plansack.updateError")),
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/plan/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/plan/${shareToken}` : null;

  if (!householdId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t("plankiste:noHousehold")}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <PageHeader
          icon={Backpack}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          title={t("plankiste:plansack.title")}
        />
        <p className="text-sm text-muted-foreground -mt-4 mb-4">{t("plankiste:plansack.subtitle")}</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : bagItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Backpack className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t("plankiste:plansack.empty")}</p>
            <p className="text-sm mt-1">{t("plankiste:plansack.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bagItems.map((item) => {
              const snapshot = item.snapshot as any;
              const type = (snapshot?.type ?? "shopping") as TemplateType;
              const TypeIcon = TYPE_ICONS[type] ?? ShoppingCart;
              const shares = (item as any).shares ?? [];
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{snapshot?.name ?? "?"}</h3>
                          <Badge variant="secondary" className={`text-xs ${TYPE_COLORS[type]}`}>
                            {type}
                          </Badge>
                        </div>
                        {snapshot?.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{snapshot.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{t("plankiste:plansack.savedAt", { date: new Date(item.createdAt).toLocaleDateString() })}</span>
                          {shares.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              {t("plankiste:plansack.shareCount", { count: shares.length })}
                            </span>
                          )}
                        </div>

                        {/* Share-Links anzeigen */}
                        {shares.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {shares.map((share: any) => (
                              <div key={share.id} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1">
                                <span className="flex-1 truncate font-mono text-muted-foreground">
                                  {`${window.location.origin}/share/plan/${share.token}`}
                                </span>
                                <button
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCopyLink(share.token)}
                                  title={t("plankiste:plansack.copyLink")}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="text-destructive hover:text-destructive/80"
                                  onClick={() => deleteShareMutation.mutate({ shareId: share.id })}
                                  title={t("plankiste:plansack.deleteLink")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Aktions-Buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                          onClick={() => setImportId(item.id)}
                          disabled={importMutation.isPending}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {t("plankiste:plansack.import")}
                        </Button>
                        {snapshot?.originalTemplateId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => updateSnapshotMutation.mutate({ bagItemId: item.id, templateId: snapshot.originalTemplateId })}
                            disabled={updateSnapshotMutation.isPending}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            {t("plankiste:plansack.update")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => { setShareItem({ id: item.id, name: snapshot?.name ?? "" }); setShareToken(null); }}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          {t("plankiste:plansack.share")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {t("plankiste:plansack.remove")}
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
      <BottomNav />

      {/* Import-Bestätigungsdialog */}
      <AlertDialog open={importId !== null} onOpenChange={open => { if (!open) setImportId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plankiste:plansack.importTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("plankiste:plansack.importDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => importId && importMutation.mutate({ bagItemId: importId, householdId, memberId })}
              disabled={importMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {t("plankiste:plansack.import")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Löschen-Bestätigungsdialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plankiste:plansack.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("plankiste:plansack.removeDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && removeMutation.mutate({ bagItemId: deleteId })}
              disabled={removeMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("plankiste:plansack.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Teilen-Dialog */}
      <Dialog open={shareItem !== null} onOpenChange={open => { if (!open) { setShareItem(null); setShareToken(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plankiste:plansack.shareTitle")}</DialogTitle>
            <DialogDescription>
              {shareItem && t("plankiste:plansack.shareDesc", { name: shareItem.name })}
            </DialogDescription>
          </DialogHeader>
          {shareToken ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("plankiste:plansack.shareLinkReady")}</p>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <span className="flex-1 text-xs font-mono break-all">{shareUrl}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 flex-shrink-0"
                  onClick={() => shareToken && handleCopyLink(shareToken)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("plankiste:plansack.shareCreateHint")}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShareItem(null); setShareToken(null); }}>
              {t("common:close")}
            </Button>
            {!shareToken && (
              <Button
                onClick={() => shareItem && shareMutation.mutate({ bagItemId: shareItem.id })}
                disabled={shareMutation.isPending}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t("plankiste:plansack.createLink")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

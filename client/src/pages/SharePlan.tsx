/**
 * SharePlan – Öffentliche Seite zum Anzeigen und Importieren einer geteilten Vorlage.
 * Aufruf via /share/plan/:token
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Backpack, Download, ShoppingCart, CheckSquare, Layers, FolderKanban, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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

export default function SharePlan() {
  const { t } = useTranslation(["plankiste", "common"]);
  const [, params] = useRoute("/share/plan/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const { household, member } = useCompatAuth();
  const householdId = household?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;
  const [imported, setImported] = useState(false);

  const { data, isLoading, error } = trpc.planBag.getSharedTemplate.useQuery(
    { token },
    { enabled: !!token }
  );

  const importMutation = trpc.planBag.importFromShare.useMutation({
    onSuccess: () => {
      toast.success(t("plankiste:plansack.imported"));
      setImported(true);
    },
    onError: () => toast.error(t("plankiste:plansack.importError")),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-600" />
          <p className="text-muted-foreground">{t("common:loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-70" />
            <h2 className="text-lg font-semibold mb-2">{t("plankiste:plansack.shareNotFound")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("plankiste:plansack.shareNotFoundDesc")}</p>
            <Button onClick={() => setLocation("/")}>{t("common:home")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot = data.snapshot;
  const type = (snapshot.type ?? "shopping") as TemplateType;
  const TypeIcon = TYPE_ICONS[type] ?? ShoppingCart;
  const shoppingCount = snapshot.shoppingItems?.length ?? 0;
  const taskCount = snapshot.taskItems?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
            <Backpack className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold">{t("plankiste:plansack.sharePageTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("plankiste:plansack.sharePageSubtitle")}</p>
        </div>

        {/* Vorlage-Karte */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <TypeIcon className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{snapshot.name}</CardTitle>
                <Badge variant="secondary" className={`text-xs mt-1 ${TYPE_COLORS[type]}`}>
                  {type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {snapshot.description && (
              <p className="text-sm text-muted-foreground">{snapshot.description}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              {shoppingCount > 0 && (
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  {t("plankiste:plansack.shoppingItemCount", { count: shoppingCount })}
                </span>
              )}
              {taskCount > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4" />
                  {t("plankiste:plansack.taskItemCount", { count: taskCount })}
                </span>
              )}
            </div>

            {/* Einkaufsartikel-Vorschau */}
            {shoppingCount > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("plankiste:plansack.previewShopping")}
                </p>
                <div className="space-y-0.5">
                  {snapshot.shoppingItems!.slice(0, 5).map((item, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span>{item.name}</span>
                      {item.quantity && <span className="text-muted-foreground text-xs">{item.quantity}</span>}
                    </div>
                  ))}
                  {shoppingCount > 5 && (
                    <p className="text-xs text-muted-foreground pl-3.5">
                      {t("plankiste:plansack.andMore", { count: shoppingCount - 5 })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Aufgaben-Vorschau */}
            {taskCount > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("plankiste:plansack.previewTasks")}
                </p>
                <div className="space-y-0.5">
                  {snapshot.taskItems!.slice(0, 5).map((task, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span>{task.name}</span>
                    </div>
                  ))}
                  {taskCount > 5 && (
                    <p className="text-xs text-muted-foreground pl-3.5">
                      {t("plankiste:plansack.andMore", { count: taskCount - 5 })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import-Button */}
        {imported ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">{t("plankiste:plansack.importedSuccess")}</p>
            <Button className="mt-3" onClick={() => setLocation("/plankiste")}>
              {t("plankiste:plansack.goToPlankiste")}
            </Button>
          </div>
        ) : householdId ? (
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            size="lg"
            onClick={() => importMutation.mutate({ token, householdId, memberId })}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {t("plankiste:plansack.importToHousehold")}
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">{t("plankiste:plansack.loginToImport")}</p>
            <Button onClick={() => setLocation("/login")}>
              {t("common:login")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

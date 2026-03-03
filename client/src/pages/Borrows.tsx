import { useState } from "react";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Package, User, Clock } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

type BorrowStatus = "all" | "pending" | "approved" | "active" | "completed" | "rejected";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};

// statusLabels are now handled via t() in the component

export default function Borrows() {
  const { t } = useTranslation(["borrows", "common"]);
  const { household, member, isAuthenticated } = useCompatAuth();
  const [borrowerStatus, setBorrowerStatus] = useState<BorrowStatus>("all");
  const [lenderStatus, setLenderStatus] = useState<BorrowStatus>("all");

  if (!isAuthenticated || !household || !member) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Bitte melden Sie sich an</p>
        </div>
      </AppLayout>
    );
  }

  // Get borrows as borrower
  const { data: myBorrows = [], isLoading: loadingMyBorrows } = trpc.borrow.getMyBorrows.useQuery({
    householdId: household.householdId,
    borrowerId: member.memberId,
  });

  // Get borrows as lender (owner)
  const { data: lentItems = [], isLoading: loadingLentItems } = trpc.borrow.getLentItems.useQuery({
    householdId: household.householdId,
    ownerId: member.memberId,
  });

  const filteredMyBorrows = borrowerStatus === "all" 
    ? myBorrows 
    : myBorrows.filter(b => b.status === borrowerStatus);

  const filteredLentItems = lenderStatus === "all"
    ? lentItems
    : lentItems.filter(b => b.status === lenderStatus);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("borrows:title")}</h1>
        </div>

        <Tabs defaultValue="borrower" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="borrower">Meine Ausleihen</TabsTrigger>
            <TabsTrigger value="lender">Verliehene Items</TabsTrigger>
          </TabsList>

          {/* Borrower Tab */}
          <TabsContent value="borrower">
            <div className="mb-4">
              <Select value={borrowerStatus} onValueChange={(v) => setBorrowerStatus(v as BorrowStatus)}>
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
                </SelectContent>
              </Select>
            </div>

            {loadingMyBorrows ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Lade Ausleihen...</p>
                </CardContent>
              </Card>
            ) : filteredMyBorrows.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">{t("borrows:noBorrows", "Keine Ausleihen gefunden")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMyBorrows.map((borrow) => (
                  <Card key={borrow.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{borrow.itemName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("borrows:owner", "Eigentümer")}: {borrow.ownerName}
                          </p>
                        </div>
                        <Badge className={statusColors[borrow.status]}>
                          {t(`borrows:status.${borrow.status}`, borrow.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:from", "Von")}: {formatDate(borrow.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:until", "Bis")}: {formatDate(borrow.endDate)}</span>
                        </div>
                      </div>
                      {borrow.status === "pending" && (
                        <p className="text-sm text-muted-foreground mt-3">
                          {t("borrows:waitingApproval", "Warte auf Genehmigung vom Eigentümer")}
                        </p>
                      )}
                      {borrow.status === "approved" && (
                        <p className="text-sm text-green-600 mt-3">
                          Genehmigt! Bitte abholen.
                        </p>
                      )}
                      {borrow.status === "rejected" && borrow.responseMessage && (
                        <p className="text-sm text-red-600 mt-3">
                          Abgelehnt: {borrow.responseMessage}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lender Tab */}
          <TabsContent value="lender">
            <div className="mb-4">
              <Select value={lenderStatus} onValueChange={(v) => setLenderStatus(v as BorrowStatus)}>
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
                </SelectContent>
              </Select>
            </div>

            {loadingLentItems ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Lade verliehene Items...</p>
                </CardContent>
              </Card>
            ) : filteredLentItems.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">{t("borrows:noLends", "Keine verliehenen Items gefunden")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLentItems.map((borrow) => (
                  <Card key={borrow.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{borrow.itemName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("borrows:borrower", "Ausleiher")}: {borrow.borrowerName}
                          </p>
                        </div>
                        <Badge className={statusColors[borrow.status]}>
                          {t(`borrows:status.${borrow.status}`, borrow.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:from", "Von")}: {formatDate(borrow.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{t("borrows:until", "Bis")}: {formatDate(borrow.endDate)}</span>
                        </div>
                      </div>
                      {borrow.status === "pending" && (
                        <div className="mt-3">
                          <Button 
                            size="sm" 
                            onClick={() => window.location.href = `/inventory/${borrow.itemId}`}
                          >
                            Anfrage prüfen
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </AppLayout>
  );
}

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Banknote, BriefcaseBusiness, ChevronLeft, Pencil, Plus, Trash2, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { canModifyBalanceEntry } from "../../../shared/balanceRules";
import { getDateFnsLocaleSync } from "@/lib/i18n";

type EntryType = "payment" | "work";

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours > 0 ? `${hours} Std. ` : ""}${rest} Min.`;
}

export default function Balance() {
  const { t, i18n } = useTranslation(["balance", "common"]);
  const dateFnsLocale = getDateFnsLocaleSync(i18n.language);
  const [, setLocation] = useLocation();
  const { household, member } = useCompatAuth();
  const utils = trpc.useUtils();
  const householdId = household?.householdId ?? 0;
  const memberId = member?.memberId ?? 0;
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [entryType, setEntryType] = useState<EntryType>("payment");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [occurredDate, setOccurredDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: settings } = trpc.balance.getSettings.useQuery(
    { householdId, memberId },
    { enabled: !!householdId && !!memberId },
  );
  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId },
    { enabled: !!householdId },
  );
  const { data: summary = [] } = trpc.balance.summary.useQuery(
    { householdId, memberId },
    { enabled: !!householdId && !!memberId },
  );
  const { data: entries = [] } = trpc.balance.list.useQuery(
    { householdId, memberId },
    { enabled: !!householdId && !!memberId },
  );

  const activeMembers = useMemo(() => members.filter((candidate: any) => candidate.isActive), [members]);
  const invalidateBalance = async () => {
    await Promise.all([
      utils.balance.list.invalidate({ householdId, memberId }),
      utils.balance.summary.invalidate({ householdId, memberId }),
    ]);
  };
  const createMutation = trpc.balance.create.useMutation({
    onSuccess: async () => {
      await invalidateBalance();
      setCreateOpen(false);
      resetForm();
      toast.success(t("balance:entryCreated"));
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.balance.update.useMutation({
    onSuccess: async () => {
      await invalidateBalance();
      setEditingEntry(null);
      resetForm();
      toast.success(t("balance:entryUpdated"));
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.balance.remove.useMutation({
    onSuccess: async () => {
      await invalidateBalance();
      toast.success(t("balance:entryDeleted"));
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setEntryType("payment");
    setSelectedMemberId("");
    setAmount("");
    setMinutes("");
    setDescription("");
    setOccurredDate(format(new Date(), "yyyy-MM-dd"));
  };
  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };
  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setEntryType(entry.entryType);
    setSelectedMemberId(String(entry.memberId));
    setAmount(entry.amount ? String(entry.amount) : "");
    setMinutes(entry.minutes ? String(entry.minutes) : "");
    setDescription(entry.description);
    setOccurredDate(format(new Date(entry.occurredAt), "yyyy-MM-dd"));
  };
  const selectedEntryMemberId = Number(selectedMemberId || memberId);
  const submit = () => {
    if (!description.trim()) return toast.error(t("balance:requiredPurpose"));
    const values = {
      householdId,
      memberId: selectedEntryMemberId,
      entryType,
      amount: entryType === "payment" ? Number(amount.replace(",", ".")) : undefined,
      minutes: entryType === "work" ? Number(minutes) : undefined,
      description: description.trim(),
      occurredAt: new Date(`${occurredDate}T12:00:00`),
    };
    if (editingEntry) {
      updateMutation.mutate({ ...values, entryId: editingEntry.id, editorMemberId: memberId });
    } else {
      createMutation.mutate({ ...values, recordedByMemberId: memberId, sourceType: "manual" });
    }
  };

  if (!householdId || !memberId) {
    return <AppLayout><div className="container py-8 text-muted-foreground">{t("common:household.select")}</div></AppLayout>;
  }

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={entryType === "payment" ? "default" : "outline"} onClick={() => setEntryType("payment")} className="gap-2"><Banknote className="h-4 w-4" /> {t("balance:payment")}</Button>
        <Button type="button" variant={entryType === "work" ? "default" : "outline"} onClick={() => setEntryType("work")} className="gap-2"><BriefcaseBusiness className="h-4 w-4" /> {t("balance:work")}</Button>
      </div>
      {settings?.allowOtherMemberSelection && (
        <div className="space-y-2">
          <Label>{t("balance:who", { action: t(entryType === "payment" ? "balance:paidAction" : "balance:workedAction") })}</Label>
          <Select value={selectedMemberId || String(memberId)} onValueChange={setSelectedMemberId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{activeMembers.map((candidate: any) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.memberName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {entryType === "payment" ? (
        <div className="space-y-2"><Label htmlFor="balance-amount">{t("balance:amount")}</Label><Input id="balance-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="24,50" /></div>
      ) : (
        <div className="space-y-2"><Label htmlFor="balance-minutes">{t("balance:workMinutes")}</Label><Input id="balance-minutes" inputMode="numeric" type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="90" /></div>
      )}
      <div className="space-y-2"><Label htmlFor="balance-description">{t("balance:purpose")}</Label><Textarea id="balance-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></div>
      <div className="space-y-2"><Label htmlFor="balance-date">{t("balance:date")}</Label><Input id="balance-date" type="date" value={occurredDate} onChange={(event) => setOccurredDate(event.target.value)} /></div>
    </div>
  );

  return (
    <AppLayout>
      <div className="container max-w-3xl py-6 pb-24 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setLocation("/")}><ChevronLeft className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> {t("balance:title")}</h1><p className="text-sm text-muted-foreground">{t("balance:subtitle")}</p></div></div>
          <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> {t("balance:addEffort")}</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {summary.map((total: any) => <Card key={total.memberId}><CardContent className="pt-5"><p className="font-semibold">{total.memberName}</p><div className="flex justify-between gap-3 mt-3 text-sm"><span className="text-muted-foreground">{t("balance:paid")}</span><strong>{Number(total.payments).toLocaleString(i18n.language, { style: "currency", currency: "EUR" })}</strong></div><div className="flex justify-between gap-3 mt-1 text-sm"><span className="text-muted-foreground">{t("balance:worked")}</span><strong>{minutesLabel(total.workMinutes)}</strong></div></CardContent></Card>)}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("balance:entries")}</CardTitle><CardDescription>{t("balance:editWindow")}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? <p className="text-sm text-muted-foreground py-4">{t("balance:noEntries")}</p> : entries.map((entry: any) => {
              const canEdit = entry.recordedByMemberId === memberId && canModifyBalanceEntry(entry.createdAt);
              return <div key={entry.id} className="flex gap-3 py-3 border-b last:border-0"><div className={`mt-0.5 h-9 w-9 rounded-full grid place-items-center ${entry.entryType === "payment" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{entry.entryType === "payment" ? <Banknote className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{entry.memberName}</p><p className="font-semibold">{entry.entryType === "payment" ? Number(entry.amount).toLocaleString(i18n.language, { style: "currency", currency: "EUR" }) : minutesLabel(Number(entry.minutes))}</p></div><p className="text-sm mt-0.5">{entry.description}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.occurredAt), "d. MMMM yyyy", { locale: dateFnsLocale })}{entry.sourceType !== "manual" ? ` · ${t(`balance:${entry.sourceType}`)}` : ""}</p></div>{canEdit && <div className="flex flex-col gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(entry)} aria-label={t("balance:edit")}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => window.confirm(t("balance:deleteConfirm")) && deleteMutation.mutate({ householdId, entryId: entry.id, editorMemberId: memberId })} aria-label={t("common:delete")}><Trash2 className="h-4 w-4" /></Button></div>}</div>;
            })}
          </CardContent>
        </Card>
      </div>
      <Dialog open={createOpen || !!editingEntry} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditingEntry(null); } }}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingEntry ? t("balance:edit") : t("balance:create")}</DialogTitle><DialogDescription>{t("balance:separateHint")}</DialogDescription></DialogHeader>{renderForm()}<DialogFooter><Button variant="outline" onClick={() => { setCreateOpen(false); setEditingEntry(null); }}>{t("balance:cancel")}</Button><Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>{editingEntry ? t("balance:save") : t("balance:record")}</Button></DialogFooter></DialogContent>
      </Dialog>
      <BottomNav />
    </AppLayout>
  );
}

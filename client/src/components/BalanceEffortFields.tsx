import { useEffect, useMemo, useState } from "react";
import { Banknote, BriefcaseBusiness, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getValidBalanceEfforts } from "../../../shared/balanceEffortDrafts";

export type BalanceEffortDraft = {
  entryType: "payment" | "work";
  amount?: number;
  minutes?: number;
  memberId?: number;
  description: string;
};

interface BalanceEffortFieldsProps {
  householdId: number;
  memberId: number;
  defaultDescription: string;
  onChange: (efforts: BalanceEffortDraft[]) => void;
}

/** Optionale Aufwandsangabe, die von Aufgaben-, Zwischenziel- und Einkaufsdialogen geteilt wird. */
export function BalanceEffortFields({ householdId, memberId, defaultDescription, onChange }: BalanceEffortFieldsProps) {
  const { t } = useTranslation(["balance", "common"]);
  const [rows, setRows] = useState<Array<BalanceEffortDraft & { id: number }>>([]);
  const nextIdRef = useRef(1);
  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId },
    { enabled: !!householdId },
  );

  useEffect(() => {
    setRows([]);
    nextIdRef.current = 1;
  }, [defaultDescription, memberId]);

  const efforts = useMemo<BalanceEffortDraft[]>(() => getValidBalanceEfforts(rows), [rows]);

  useEffect(() => onChange(efforts), [efforts, onChange]);

  const activeMembers = members.filter((candidate: any) => candidate.isActive);
  const addRow = (entryType: BalanceEffortDraft["entryType"]) => {
    setRows((current) => [...current, {
      id: nextIdRef.current++, entryType, memberId, description: defaultDescription,
      amount: entryType === "payment" ? undefined : undefined,
      minutes: entryType === "work" ? undefined : undefined,
    }]);
  };
  const updateRow = (id: number, patch: Partial<BalanceEffortDraft>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">{t("balance:effortTitle")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("balance:multipleEffortsHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addRow("payment")}><Plus className="h-4 w-4" /><Banknote className="h-4 w-4" /> {t("balance:addPayment")}</Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addRow("work")}><Plus className="h-4 w-4" /><BriefcaseBusiness className="h-4 w-4" /> {t("balance:addWork")}</Button>
      </div>
      {rows.map((row, index) => <div key={row.id} className="rounded-md border bg-background p-3 space-y-2">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">{t("balance:person")} {index + 1}</p><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRows((current) => current.filter((candidate) => candidate.id !== row.id))} aria-label={t("balance:removeEffort")}><Trash2 className="h-4 w-4" /></Button></div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(row.memberId ?? memberId)} onValueChange={(value) => updateRow(row.id, { memberId: Number(value) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{activeMembers.map((candidate: any) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.memberName}</SelectItem>)}</SelectContent></Select>
          <Select value={row.entryType} onValueChange={(value: "payment" | "work") => updateRow(row.id, { entryType: value, amount: undefined, minutes: undefined })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="payment">{t("balance:payment")}</SelectItem><SelectItem value="work">{t("balance:work")}</SelectItem></SelectContent></Select>
        </div>
        {row.entryType === "payment" ? <Input className="h-9" inputMode="decimal" value={row.amount ?? ""} onChange={(event) => updateRow(row.id, { amount: Number(event.target.value.replace(",", ".")) })} placeholder={t("balance:amount")} /> : <Input className="h-9" inputMode="numeric" type="number" min="1" value={row.minutes ?? ""} onChange={(event) => updateRow(row.id, { minutes: Number(event.target.value) })} placeholder={t("balance:workMinutes")} />}
        <Input className="h-9" value={row.description} onChange={(event) => updateRow(row.id, { description: event.target.value })} placeholder={t("balance:purpose")} />
      </div>)}
    </div>
  );
}

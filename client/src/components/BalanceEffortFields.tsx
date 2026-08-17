import { useEffect, useMemo, useState } from "react";
import { Banknote, BriefcaseBusiness } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [addPayment, setAddPayment] = useState(false);
  const [addWork, setAddWork] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(String(memberId));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [workMinutes, setWorkMinutes] = useState("");
  const [description, setDescription] = useState(defaultDescription);
  const { data: settings } = trpc.balance.getSettings.useQuery(
    { householdId, memberId },
    { enabled: !!householdId && !!memberId },
  );
  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId },
    { enabled: !!householdId },
  );

  useEffect(() => {
    setSelectedMemberId(String(memberId));
    setDescription(defaultDescription);
    setAddPayment(false);
    setAddWork(false);
    setPaymentAmount("");
    setWorkMinutes("");
  }, [defaultDescription, memberId]);

  const efforts = useMemo<BalanceEffortDraft[]>(() => {
    const targetMemberId = Number(selectedMemberId || memberId);
    const currentDescription = description.trim() || defaultDescription;
    return [
      ...(addPayment ? [{ entryType: "payment" as const, amount: Number(paymentAmount.replace(",", ".")), memberId: targetMemberId, description: currentDescription }] : []),
      ...(addWork ? [{ entryType: "work" as const, minutes: Number(workMinutes), memberId: targetMemberId, description: currentDescription }] : []),
    ];
  }, [addPayment, addWork, defaultDescription, description, memberId, paymentAmount, selectedMemberId, workMinutes]);

  useEffect(() => onChange(efforts), [efforts, onChange]);

  const activeMembers = members.filter((candidate: any) => candidate.isActive);
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">{t("balance:effortTitle")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("balance:effortHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={addPayment ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setAddPayment((current) => !current)}><Banknote className="h-4 w-4" /> {t("balance:payment")}</Button>
        <Button type="button" variant={addWork ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setAddWork((current) => !current)}><BriefcaseBusiness className="h-4 w-4" /> {t("balance:work")}</Button>
      </div>
      {settings?.allowOtherMemberSelection && (addPayment || addWork) && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("balance:person")}</Label>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{activeMembers.map((candidate: any) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.memberName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {addPayment && <div className="space-y-1.5"><Label htmlFor="balance-effort-payment" className="text-xs">{t("balance:amount")}</Label><Input id="balance-effort-payment" className="h-9" inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="24,50" /></div>}
      {addWork && <div className="space-y-1.5"><Label htmlFor="balance-effort-work" className="text-xs">{t("balance:workMinutes")}</Label><Input id="balance-effort-work" className="h-9" inputMode="numeric" type="number" min="1" value={workMinutes} onChange={(event) => setWorkMinutes(event.target.value)} placeholder="90" /></div>}
      {(addPayment || addWork) && <div className="space-y-1.5"><Label htmlFor="balance-effort-description" className="text-xs">{t("balance:purpose")}</Label><Input id="balance-effort-description" className="h-9" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("common:labels.optional", "optional")} /></div>}
    </div>
  );
}

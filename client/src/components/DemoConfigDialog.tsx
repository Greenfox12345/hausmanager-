import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Users, ShoppingCart, CheckSquare, X, UserCircle, Minus, Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface DemoConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_MEMBER_NAMES = ["Alex", "Maria", "Jonas", "Sophie"];

export default function DemoConfigDialog({ open, onClose }: DemoConfigDialogProps) {
  const [, setLocation] = useLocation();
  const { login, setCurrentHousehold } = useUserAuth();

  // Eigener Name
  const [ownerName, setOwnerName] = useState("");

  // Mitbewohner: dynamische Anzahl (1–4)
  const [memberCount, setMemberCount] = useState(3);
  const [memberNames, setMemberNames] = useState<string[]>(["", "", "", ""]);

  // Items
  const [shoppingItemCount, setShoppingItemCount] = useState(11);
  const [taskCount, setTaskCount] = useState(8);
  const [inventoryCount, setInventoryCount] = useState(6);

  const createDemoMutation = trpc.demo.createSession.useMutation({
    onSuccess: (data) => {
      login(data.demoJwt);
      localStorage.setItem("demo_token", data.demoToken);
      localStorage.setItem("demo_expires_at", data.expiresAt);
      // Persist owner name so Register can prefill it
      if (ownerName.trim()) {
        localStorage.setItem("demo_owner_name", ownerName.trim());
      }
      window.dispatchEvent(new Event("demo-session-changed"));
      setCurrentHousehold({
        householdId: data.householdId,
        householdName: data.householdName,
        memberId: data.memberId,
        memberName: data.memberName,
      });
      onClose();
      setLocation("/shopping");
    },
    onError: () => {
      toast.error("Demo konnte nicht gestartet werden.");
    },
  });

  const handleStart = () => {
    // memberNames are the OTHER household members (not the owner)
    // ownerName is sent separately as slot 0
    const resolvedMemberNames = Array.from({ length: memberCount }, (_, i) =>
      memberNames[i]?.trim() || DEFAULT_MEMBER_NAMES[i]
    );
    createDemoMutation.mutate({
      ownerName: ownerName.trim() || undefined,
      memberNames: resolvedMemberNames,
      shoppingItemCount,
      taskCount,
      inventoryCount,
    });
  };

  const updateMemberName = (index: number, value: string) => {
    setMemberNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const decreaseMemberCount = () => setMemberCount((c) => Math.max(1, c - 1));
  const increaseMemberCount = () => setMemberCount((c) => Math.min(4, c + 1));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col top-[5vh] translate-y-0">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-full bg-amber-100 p-2">
              <FlaskConical className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Demo konfigurieren</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Passe die Demo an deinen Haushalt an.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 overflow-y-auto flex-1 min-h-0 pr-1">

          {/* ── Eigener Name ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Dein Name</Label>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="z. B. Max"
              maxLength={30}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Wird bei der Registrierung vorausgefüllt und kann dort geändert werden.
            </p>
          </div>

          <Separator />

          {/* ── Mitbewohner ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Mitbewohner</Label>
                <span className="text-xs text-muted-foreground">(andere Personen im Haushalt)</span>
              </div>
              {/* Stepper für Anzahl */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={decreaseMemberCount}
                  disabled={memberCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-semibold tabular-nums w-4 text-center text-amber-700">
                  {memberCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={increaseMemberCount}
                  disabled={memberCount >= 4}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: memberCount }, (_, i) => (
                <div key={i} className="relative">
                  <Input
                    value={memberNames[i] ?? ""}
                    onChange={(e) => updateMemberName(i, e.target.value)}
                    placeholder={DEFAULT_MEMBER_NAMES[i]}
                    maxLength={30}
                    className="pr-7 text-sm"
                  />
                  {memberNames[i] && (
                    <button
                      type="button"
                      onClick={() => updateMemberName(i, "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Diese Personen sind zusätzlich zu dir im Demo-Haushalt. Leere Felder erhalten Standardnamen.</p>
          </div>

          <Separator />

          {/* ── Einkaufsliste ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Einkaufsliste</Label>
              </div>
              <span className="text-sm font-semibold tabular-nums text-amber-700">
                {shoppingItemCount === 0 ? "Leer" : `${shoppingItemCount} Artikel`}
              </span>
            </div>
            <Slider
              min={0}
              max={11}
              step={1}
              value={[shoppingItemCount]}
              onValueChange={([v]) => setShoppingItemCount(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Leer</span>
              <span>Voll (11)</span>
            </div>
          </div>

          {/* ── Aufgaben ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Aufgaben</Label>
              </div>
              <span className="text-sm font-semibold tabular-nums text-amber-700">
                {taskCount === 0 ? "Keine" : `${taskCount} ${taskCount === 1 ? "Aufgabe" : "Aufgaben"}`}
              </span>
            </div>
            <Slider
              min={0}
              max={8}
              step={1}
              value={[taskCount]}
              onValueChange={([v]) => setTaskCount(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Keine</span>
              <span>Alle (8)</span>
            </div>
          </div>

          {/* ── Inventar ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Inventar</Label>
              </div>
              <span className="text-sm font-semibold tabular-nums text-amber-700">
                {inventoryCount === 0 ? "Leer" : `${inventoryCount} ${inventoryCount === 1 ? "Gegenstand" : "Gegenstände"}`}
              </span>
            </div>
            <Slider
              min={0}
              max={6}
              step={1}
              value={[inventoryCount]}
              onValueChange={([v]) => setInventoryCount(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Leer</span>
              <span>Alle (6)</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={createDemoMutation.isPending}>
            Abbrechen
          </Button>
          <Button
            onClick={handleStart}
            disabled={createDemoMutation.isPending}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <FlaskConical className="h-4 w-4" />
            {createDemoMutation.isPending ? "Wird gestartet…" : "Demo starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

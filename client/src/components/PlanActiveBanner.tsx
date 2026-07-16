/**
 * PlanActiveBanner – zeigt aktive Plankiste-Pläne auf der Shopping-Seite an.
 * Ermöglicht das Übertragen von Artikeln direkt in die Einkaufsliste.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, ChevronDown, ChevronUp, ShoppingCart,
  ArrowRight, Check, X, Play
} from "lucide-react";
import { formatQuantityWithUnit } from "@/components/QuantityInput";
import { useLocation } from "wouter";

interface PlanActiveBannerProps {
  householdId: number;
  memberId: number;
}

export function PlanActiveBanner({ householdId, memberId }: PlanActiveBannerProps) {
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedInstanceId, setExpandedInstanceId] = useState<number | null>(null);

  const { data: instances = [] } = trpc.planTemplates.listInstances.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  const activeInstances = (instances as any[]).filter((i: any) => i.status === "active");

  if (activeInstances.length === 0) return null;

  const totalPending = activeInstances.reduce(
    (sum: number, i: any) => sum + (i.totalItems - i.transferredItems), 0
  );

  return (
    <div className="mb-4 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-800">Plankiste</span>
            <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0">
              {activeInstances.length} aktiv
            </Badge>
          </div>
          {!isExpanded && totalPending > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              {totalPending} Artikel noch nicht übertragen
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-200"
            onClick={(e) => { e.stopPropagation(); setLocation("/plankiste"); }}
          >
            Öffnen
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-600" />
          )}
        </div>
      </button>

      {/* Aufgeklappte Instanzliste */}
      {isExpanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {activeInstances.map((instance: any) => (
            <InstanceRow
              key={instance.id}
              instance={instance}
              householdId={householdId}
              memberId={memberId}
              isExpanded={expandedInstanceId === instance.id}
              onToggle={() => setExpandedInstanceId(
                expandedInstanceId === instance.id ? null : instance.id
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Einzelne Instanz-Zeile ───────────────────────────────────────────────────
function InstanceRow({
  instance, householdId, memberId, isExpanded, onToggle
}: {
  instance: any;
  householdId: number;
  memberId: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const utils = trpc.useUtils();
  const pending = instance.totalItems - instance.transferredItems;

  const transferAllMutation = trpc.planTemplates.transferAllItems.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.planTemplates.getInstance.invalidate({ instanceId: instance.id });
      utils.shopping.list.invalidate({ householdId });
      toast.success(`${data.count} Artikel hinzugefügt`);
    },
    onError: () => toast.error("Fehler beim Übertragen"),
  });

  const completeMutation = trpc.planTemplates.completeInstance.useMutation({
    onSuccess: () => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      toast.success("Plan abgeschlossen");
    },
    onError: () => toast.error("Fehler beim Abschließen"),
  });

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-amber-100/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 truncate">
            {instance.label ?? instance.templateName}
          </p>
          <p className="text-xs text-amber-600">
            {instance.transferredItems}/{instance.totalItems} übertragen
            {pending > 0 && ` · ${pending} ausstehend`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {pending > 0 && (
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={() => transferAllMutation.mutate({ instanceId: instance.id, householdId, memberId })}
              disabled={transferAllMutation.isPending}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Alle übertragen
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => completeMutation.mutate({ instanceId: instance.id, householdId, memberId })}
            disabled={completeMutation.isPending}
          >
            <Check className="w-3 h-3 mr-1" />
            Abschließen
          </Button>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <InstanceItemsInline
          instanceId={instance.id}
          householdId={householdId}
          memberId={memberId}
        />
      )}
    </div>
  );
}

// ─── Artikelliste einer Instanz (kompakt) ─────────────────────────────────────
function InstanceItemsInline({
  instanceId, householdId, memberId
}: { instanceId: number; householdId: number; memberId: number }) {
  const utils = trpc.useUtils();

  const { data: instance } = trpc.planTemplates.getInstance.useQuery(
    { instanceId },
    { enabled: instanceId > 0 }
  );

  const transferItemMutation = trpc.planTemplates.transferItems.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.shopping.list.invalidate({ householdId });
      toast.success("Artikel hinzugefügt");
    },
    onError: () => toast.error("Fehler"),
  });

  const untransferMutation = trpc.planTemplates.untransferItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.shopping.list.invalidate({ householdId });
    },
    onError: () => toast.error("Fehler"),
  });

  const items = instance?.items ?? [];
  const pendingItems = items.filter((i: any) => !i.isTransferred);
  const transferredItems = items.filter((i: any) => i.isTransferred);

  return (
    <div className="px-4 pb-3 space-y-1">
      {pendingItems.map((item: any) => {
        const unit = item.unitId ? { id: item.unitId, name: item.unitName, symbol: item.unitSymbol } : null;
        return (
          <div key={item.id} className="flex items-center gap-2 py-0.5">
            {item.categoryColor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor }} />
            )}
            <span className="flex-1 text-sm text-amber-900">{item.name}</span>
            {item.quantity && (
              <span className="text-xs text-amber-600">{formatQuantityWithUnit(item.quantity, unit)}</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-xs text-green-700 hover:bg-green-100"
              onClick={() => transferItemMutation.mutate({
                instanceId,
                householdId,
                memberId,
                items: [{
                  instanceItemId: item.id,
                  name: item.name,
                  categoryId: item.categoryId,
                  quantity: item.quantity ? parseFloat(item.quantity) : null,
                  unitId: item.unitId,
                  notes: item.notes,
                }],
              })}
              disabled={transferItemMutation.isPending}
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        );
      })}
      {transferredItems.length > 0 && (
        <div className="pt-1 border-t border-amber-100">
          {transferredItems.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 py-0.5 opacity-50">
              <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
              <span className="flex-1 text-xs line-through text-amber-800">{item.name}</span>
              {item.shoppingItemId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-muted-foreground"
                  onClick={() => untransferMutation.mutate({
                    instanceItemId: item.id,
                    shoppingItemId: item.shoppingItemId,
                  })}
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * PlanTaskBanner – zeigt aktive Plankiste-Pläne mit Aufgaben auf der Aufgaben-Seite an.
 * Ermöglicht das Übertragen von Aufgaben direkt in die Aufgabenliste.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, ChevronDown, ChevronUp, CheckSquare,
  ArrowRight, Check, X
} from "lucide-react";
import { useLocation } from "wouter";

interface PlanTaskBannerProps {
  householdId: number;
  memberId: number;
}

export function PlanTaskBanner({ householdId, memberId }: PlanTaskBannerProps) {
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedInstanceId, setExpandedInstanceId] = useState<number | null>(null);

  const { data: instances = [] } = trpc.planTemplates.listInstances.useQuery(
    { householdId },
    { enabled: householdId > 0 }
  );

  // Nur aktive Instanzen mit Aufgaben anzeigen
  const activeInstances = (instances as any[]).filter(
    (i: any) => i.status === "active" && (i.totalTaskItems ?? 0) > 0
  );

  if (activeInstances.length === 0) return null;

  const totalPending = activeInstances.reduce(
    (sum: number, i: any) => sum + ((i.totalTaskItems ?? 0) - (i.transferredTaskItems ?? 0)),
    0
  );

  return (
    <div className="mb-4 border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-800">Plankiste</span>
            <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0">
              {activeInstances.length} aktiv
            </Badge>
          </div>
          {!isExpanded && totalPending > 0 && (
            <p className="text-xs text-blue-600 mt-0.5">
              {totalPending} Aufgabe{totalPending !== 1 ? "n" : ""} noch nicht übertragen
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-200"
            onClick={(e) => { e.stopPropagation(); setLocation("/plankiste"); }}
          >
            Öffnen
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          )}
        </div>
      </button>

      {/* Aufgeklappte Instanzliste */}
      {isExpanded && (
        <div className="border-t border-blue-200 divide-y divide-blue-100">
          {activeInstances.map((instance: any) => (
            <TaskInstanceRow
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
function TaskInstanceRow({
  instance, householdId, memberId, isExpanded, onToggle
}: {
  instance: any;
  householdId: number;
  memberId: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const utils = trpc.useUtils();
  const transferred = instance.transferredTaskItems ?? 0;
  const total = instance.totalTaskItems ?? 0;
  const pending = total - transferred;

  const transferAllMutation = trpc.planTemplates.transferAllTaskItems.useMutation({
    onSuccess: (data) => {
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.planTemplates.getInstance.invalidate({ instanceId: instance.id });
      utils.tasks.list.invalidate({ householdId });
      toast.success(`${data.count} Aufgabe${data.count !== 1 ? "n" : ""} übertragen`);
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
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-100/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 truncate">
            {instance.label ?? instance.templateName}
          </p>
          <p className="text-xs text-blue-600">
            {transferred}/{total} übertragen
            {pending > 0 && ` · ${pending} ausstehend`}
          </p>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {pending > 0 && (
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={() => transferAllMutation.mutate({ instanceId: instance.id, householdId, memberId })}
              disabled={transferAllMutation.isPending}
            >
              <CheckSquare className="w-3 h-3 mr-1" />
              Alle übertragen
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 w-full"
            onClick={() => completeMutation.mutate({ instanceId: instance.id, householdId, memberId })}
            disabled={completeMutation.isPending}
          >
            <Check className="w-3 h-3 mr-1" />
            Abschließen
          </Button>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <TaskItemsInline
          instanceId={instance.id}
          householdId={householdId}
          memberId={memberId}
        />
      )}
    </div>
  );
}

// ─── Aufgabenliste einer Instanz (kompakt) ────────────────────────────────────
function TaskItemsInline({
  instanceId, householdId, memberId
}: { instanceId: number; householdId: number; memberId: number }) {
  const utils = trpc.useUtils();

  const { data: instance } = trpc.planTemplates.getInstance.useQuery(
    { instanceId },
    { enabled: instanceId > 0 }
  );

  const transferTaskMutation = trpc.planTemplates.transferTaskItems.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.tasks.list.invalidate({ householdId });
      toast.success("Aufgabe übertragen");
    },
    onError: () => toast.error("Fehler"),
  });

  const untransferTaskMutation = trpc.planTemplates.untransferTaskItem.useMutation({
    onSuccess: () => {
      utils.planTemplates.getInstance.invalidate({ instanceId });
      utils.planTemplates.listInstances.invalidate({ householdId });
      utils.tasks.list.invalidate({ householdId });
    },
    onError: () => toast.error("Fehler"),
  });

  const taskItems: any[] = instance?.taskItems ?? [];
  const pendingTasks = taskItems.filter((t: any) => !t.isTransferred);
  const transferredTasks = taskItems.filter((t: any) => t.isTransferred);

  const FREQ_LABELS: Record<string, string> = {
    once: "Einmalig", daily: "Täglich", weekly: "Wöchentlich",
    monthly: "Monatlich", custom: "Benutzerdefiniert"
  };

  return (
    <div className="px-4 pb-3 space-y-1">
      {pendingTasks.map((task: any) => (
        <div key={task.id} className="flex items-center gap-2 py-0.5">
          <CheckSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-blue-900">{task.name}</span>
          {task.frequency && task.frequency !== "once" && (
            <span className="text-xs text-blue-500 bg-blue-100 px-1 rounded">
              {FREQ_LABELS[task.frequency] ?? task.frequency}
            </span>
          )}
          {task.dueDaysFromStart != null && (
            <span className="text-xs text-amber-600">
              +{task.dueDaysFromStart}T
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs text-blue-700 hover:bg-blue-100"
            onClick={() => transferTaskMutation.mutate({
              instanceId,
              householdId,
              memberId,
              itemIds: [task.id],
            })}
            disabled={transferTaskMutation.isPending}
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      ))}
      {transferredTasks.length > 0 && (
        <div className="pt-1 border-t border-blue-100">
          {transferredTasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-2 py-0.5 opacity-50">
              <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
              <span className="flex-1 text-xs line-through text-blue-800">{task.name}</span>
              {task.taskId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-muted-foreground"
                  onClick={() => untransferTaskMutation.mutate({
                    instanceItemId: task.id,
                    taskId: task.taskId,
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

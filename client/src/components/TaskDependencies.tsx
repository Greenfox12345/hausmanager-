import React from "react";
import { ArrowRight, ArrowLeft, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { useTranslation } from "react-i18next";

interface Dependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: "prerequisite" | "followup";
}

interface Task {
  id: number;
  name: string;
}

interface TaskDependenciesProps {
  taskId: number;
  dependencies?: Dependency[]; // Optional - will be loaded if not provided
  allTasks: Task[];
  compact?: boolean;
}

export default function TaskDependencies({
  taskId,
  dependencies: providedDependencies,
  allTasks,
  compact = false,
}: TaskDependenciesProps) {
  const { t } = useTranslation("tasks");
  const { household } = useCompatAuth();
  
  // Load dependencies if not provided
  const { data: loadedDependencies = [] } = trpc.projects.getDependencies.useQuery(
    { taskId, householdId: household?.householdId ?? 0 },
    { enabled: providedDependencies === undefined && !!household }
  );
  
  // Use provided dependencies if available, otherwise use loaded ones
  const dependencies = providedDependencies ?? loadedDependencies;
  // Get prerequisites (tasks that must be completed before this task)
  const prerequisites = dependencies.filter(
    (dep) => dep.taskId === taskId && dep.dependencyType === "prerequisite"
  );

  // Get followups (tasks that should follow this task)
  const followups = dependencies.filter(
    (dep) => dep.taskId === taskId && dep.dependencyType === "followup"
  );

  if (prerequisites.length === 0 && followups.length === 0) {
    return null;
  }

  const getTaskName = (taskId: number) => {
    const task = allTasks.find((t) => t.id === taskId);
    return task?.name || t("tasks:unknownTask");
  };

  if (compact) {
    // Compact view: just show count badges
    return (
      <div className="flex items-center gap-2">
        {prerequisites.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" />
            {prerequisites.length} {t("tasks:prerequisite")}{prerequisites.length > 1 ? t("tasks:prerequisitePluralSuffix") : ""}
          </Badge>
        )}
        {followups.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            {followups.length} {t("tasks:followup")}{followups.length > 1 ? t("tasks:followupPluralSuffix") : ""}
          </Badge>
        )}
      </div>
    );
  }

  // Full view: show task names
  return (
    <div className="space-y-2 text-sm">
      {prerequisites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ArrowLeft className="h-3 w-3" />
            <span className="font-medium">{t("tasks:prerequisites")}</span>
          </div>
          <div className="pl-5 space-y-1">
            {prerequisites.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2">
                <Link2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{getTaskName(dep.dependsOnTaskId)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {followups.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{t("tasks:followups")}</span>
          </div>
          <div className="pl-5 space-y-1">
            {followups.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2">
                <Link2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{getTaskName(dep.dependsOnTaskId)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

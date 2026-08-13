export type TaskDependencyType = "prerequisite" | "followup";

export interface TaskDependencyEdge {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: TaskDependencyType;
}

/** Liefert alle direkten und indirekten Voraussetzungen einer Aufgabe. */
export function getPrerequisiteClosure(taskId: number, dependencies: TaskDependencyEdge[]): Set<number> {
  const closure = new Set<number>();
  const queue = [taskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;
    for (const edge of dependencies) {
      if (edge.taskId !== currentTaskId || edge.dependencyType !== "prerequisite") continue;
      if (!closure.has(edge.dependsOnTaskId)) {
        closure.add(edge.dependsOnTaskId);
        queue.push(edge.dependsOnTaskId);
      }
    }
  }

  closure.delete(taskId);
  return closure;
}

/** Liefert alle direkten und indirekten Folgeaufgaben einer Aufgabe. */
export function getFollowupClosure(taskId: number, dependencies: TaskDependencyEdge[]): Set<number> {
  const closure = new Set<number>();
  const queue = [taskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;
    for (const edge of dependencies) {
      if (edge.taskId !== currentTaskId || edge.dependencyType !== "followup") continue;
      if (!closure.has(edge.dependsOnTaskId)) {
        closure.add(edge.dependsOnTaskId);
        queue.push(edge.dependsOnTaskId);
      }
    }
  }

  closure.delete(taskId);
  return closure;
}

/**
 * Prüft, ob eine neue gerichtete Voraussetzung taskId → dependsOnTaskId
 * einen Selbstbezug oder einen Zyklus erzeugen würde.
 */
export function wouldCreatePrerequisiteCycle(
  taskId: number,
  dependsOnTaskId: number,
  dependencies: TaskDependencyEdge[],
): boolean {
  if (taskId === dependsOnTaskId) return true;
  return getPrerequisiteClosure(dependsOnTaskId, dependencies).has(taskId);
}

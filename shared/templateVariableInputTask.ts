export type TemplateTaskVariableInputState = {
  id: number;
  variableInputNames?: unknown;
};

export type TemplateTaskVariableInputUpdate = {
  id: number;
  variableInputNames: string[];
};

/**
 * Ordnet eine Variable innerhalb eines Plans genau einer Aufgabe zu.
 * Eine leere Ziel-ID entfernt die Zuordnung vollständig.
 */
export function buildTemplateVariableInputTaskUpdates(
  tasks: TemplateTaskVariableInputState[],
  variableName: string,
  targetTaskId: number | null,
): TemplateTaskVariableInputUpdate[] {
  return tasks.flatMap((task) => {
    const currentNames = Array.isArray(task.variableInputNames)
      ? task.variableInputNames.filter((name): name is string => typeof name === "string")
      : [];
    const withoutVariable = currentNames.filter(name => name !== variableName);
    const nextNames = task.id === targetTaskId
      ? [...withoutVariable, variableName]
      : withoutVariable;
    const changed = nextNames.length !== currentNames.length
      || nextNames.some((name, index) => name !== currentNames[index]);

    return changed ? [{ id: task.id, variableInputNames: nextNames }] : [];
  });
}

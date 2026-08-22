export type AvailabilityVariable = {
  name: string;
  value?: string | null;
  overrideValue?: string | null;
  description?: string | null;
  inputScope?: "fixed" | "runtime" | null;
};

export type AvailabilityPhase = {
  id: string;
  order: number;
  name?: string;
};

export type AvailabilityTask = {
  id?: number;
  name: string;
  description?: string | null;
  phaseId?: string | null;
  sortOrder?: number | null;
  variableInputNames?: string[] | null;
};

export type AvailabilityShoppingItem = {
  name: string;
  quantity?: string | null;
  notes?: string | null;
  phaseId?: string | null;
};

export type VariableAvailability = {
  taskInputNamesByKey: Record<string, string[]>;
  inputTaskKeyByName: Record<string, string | undefined>;
  taskPhaseIdByKey: Record<string, string | null | undefined>;
  requiredInputNamesByTaskKey: Record<string, string[]>;
  requiredInputNamesByShoppingKey: Record<string, string[]>;
  unresolvedNamesByTaskKey: Record<string, string[]>;
  unresolvedNamesByShoppingKey: Record<string, string[]>;
  prerequisiteInputTaskKeysByKey: Record<string, string[]>;
  unassignableInputsByPhase: Record<string, string[]>;
  unresolvedVariableNames: string[];
  availableInputNames: string[];
};

const tokenPattern = /VAR([A-Za-zÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß_]*)/g;

export function planTaskKey(task: AvailabilityTask, index: number): string {
  return task.id !== undefined ? `id:${task.id}` : `index:${index}`;
}

function calculationDefinitionOf(variable: AvailabilityVariable): string | undefined {
  const escapedName = variable.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = variable.description?.match(new RegExp(`VAR${escapedName}\\s*=\\s*([^\\n]+)`, "m"));
  return assignment?.[1]?.trim() || variable.value?.trim() || undefined;
}

export function referencedProjectVariableNames(text: string | null | undefined, variables: AvailabilityVariable[]): string[] {
  if (!text) return [];
  const knownNames = new Set(variables.map((variable) => variable.name));
  const references = new Set<string>();
  const matches = text.match(tokenPattern) ?? [];
  for (const token of matches) {
    const name = token.slice(3);
    if (knownNames.has(name)) references.add(name);
  }
  return Array.from(references);
}

export function isProjectInputVariable(variable: AvailabilityVariable): boolean {
  return !/VAR[A-Za-zÄÖÜäöüß]/.test(calculationDefinitionOf(variable) ?? "");
}

/** Nur diese Eingabevariablen werden an die erste passende Aufgabe eines Durchlaufs gebunden. */
export function isProjectRuntimeInputVariable(variable: AvailabilityVariable): boolean {
  return isProjectInputVariable(variable) && variable.inputScope === "runtime";
}

/** Leitet die direkten Eingaben einer Formel rekursiv und mit Zyklusschutz ab. */
export function getRequiredInputVariableNames(
  variableName: string,
  variables: AvailabilityVariable[],
  visiting = new Set<string>(),
): { inputNames: string[]; unresolved: string[] } {
  const variable = variables.find((entry) => entry.name === variableName);
  if (!variable || visiting.has(variableName)) return { inputNames: [], unresolved: [variableName] };
  if (isProjectInputVariable(variable)) return { inputNames: [variableName], unresolved: [] };
  if (variable.overrideValue?.trim()) return { inputNames: [], unresolved: [] };

  const references = referencedProjectVariableNames(calculationDefinitionOf(variable), variables);
  if (references.length === 0) return { inputNames: [], unresolved: [variableName] };
  const nextVisiting = new Set(visiting);
  nextVisiting.add(variableName);
  const inputNames = new Set<string>();
  const unresolved = new Set<string>();
  for (const reference of references) {
    const dependency = getRequiredInputVariableNames(reference, variables, nextVisiting);
    dependency.inputNames.forEach((name) => inputNames.add(name));
    dependency.unresolved.forEach((name) => unresolved.add(name));
  }
  return { inputNames: Array.from(inputNames), unresolved: Array.from(unresolved) };
}

function requiredInputsForTexts(texts: Array<string | null | undefined>, variables: AvailabilityVariable[]) {
  const inputNames = new Set<string>();
  const unresolved = new Set<string>();
  for (const text of texts) {
    for (const variableName of referencedProjectVariableNames(text, variables)) {
      const dependency = getRequiredInputVariableNames(variableName, variables);
      dependency.inputNames.forEach((name) => inputNames.add(name));
      dependency.unresolved.forEach((name) => unresolved.add(name));
    }
  }
  return { inputNames: Array.from(inputNames), unresolved: Array.from(unresolved) };
}

/**
 * Ordnet jede noch fehlende Eingabe ihrer ersten verwendenden Aufgabe zu und
 * leitet daraus die erforderliche Aufgabenreihenfolge ab.
 */
export function analyseProjectVariableAvailability(
  variables: AvailabilityVariable[],
  phases: AvailabilityPhase[],
  tasks: AvailabilityTask[],
  shoppingItems: AvailabilityShoppingItem[] = [],
): VariableAvailability {
  const phaseOrder = new Map(phases.map((phase) => [phase.id, phase.order]));
  const orderedTasks = tasks.map((task, index) => ({ task, index, key: planTaskKey(task, index) }))
    .sort((left, right) => {
      const phaseDifference = (phaseOrder.get(left.task.phaseId ?? "") ?? -1) - (phaseOrder.get(right.task.phaseId ?? "") ?? -1);
      return phaseDifference || ((left.task.sortOrder ?? left.index) - (right.task.sortOrder ?? right.index));
    });
  const availableInputNames = variables
    .filter((variable) => isProjectInputVariable(variable) && Boolean(variable.value?.trim()))
    .map((variable) => variable.name);
  const availableInputs = new Set(availableInputNames);
  const inputTaskKeyByName: Record<string, string | undefined> = {};
  const taskPhaseIdByKey: Record<string, string | null | undefined> = {};
  const requiredInputNamesByTaskKey: Record<string, string[]> = {};
  const unresolvedNamesByTaskKey: Record<string, string[]> = {};
  const unresolved = new Set<string>();

  // Eine im Projekt ausdrücklich gewählte Eingabeaufgabe hat Vorrang vor der
  // automatischen Zuordnung zur ersten Verwendung der Variable.
  for (const entry of orderedTasks) {
    for (const name of entry.task.variableInputNames ?? []) {
      const variable = variables.find((candidate) => candidate.name === name);
      if (variable && isProjectRuntimeInputVariable(variable) && !availableInputs.has(name)) {
        inputTaskKeyByName[name] = entry.key;
      }
    }
  }

  for (const entry of orderedTasks) {
    const requirement = requiredInputsForTexts([entry.task.name, entry.task.description], variables);
    for (const name of entry.task.variableInputNames ?? []) {
      const variable = variables.find((candidate) => candidate.name === name);
      if (variable && isProjectRuntimeInputVariable(variable) && !requirement.inputNames.includes(name)) {
        requirement.inputNames.push(name);
      }
    }
    taskPhaseIdByKey[entry.key] = entry.task.phaseId;
    requiredInputNamesByTaskKey[entry.key] = requirement.inputNames;
    unresolvedNamesByTaskKey[entry.key] = requirement.unresolved;
    requirement.unresolved.forEach((name) => unresolved.add(name));
    requirement.inputNames.forEach((name) => {
      const inputVariable = variables.find((variable) => variable.name === name);
      if (inputVariable && isProjectRuntimeInputVariable(inputVariable) && !availableInputs.has(name) && !inputTaskKeyByName[name]) inputTaskKeyByName[name] = entry.key;
    });
  }

  const requiredInputNamesByShoppingKey: Record<string, string[]> = {};
  const unresolvedNamesByShoppingKey: Record<string, string[]> = {};
  for (let shoppingIndex = 0; shoppingIndex < shoppingItems.length; shoppingIndex += 1) {
    const item = shoppingItems[shoppingIndex];
    const requirement = requiredInputsForTexts([item.name, item.quantity, item.notes], variables);
    requiredInputNamesByShoppingKey[`index:${shoppingIndex}`] = requirement.inputNames;
    unresolvedNamesByShoppingKey[`index:${shoppingIndex}`] = requirement.unresolved;
    requirement.unresolved.forEach((name) => unresolved.add(name));
  }

  const taskInputNamesByKey: Record<string, string[]> = {};
  Object.entries(inputTaskKeyByName).forEach(([name, key]) => {
    if (key) taskInputNamesByKey[key] = [...(taskInputNamesByKey[key] ?? []), name];
  });

  const prerequisiteInputTaskKeysByKey: Record<string, string[]> = {};
  for (const entry of orderedTasks) {
    const prerequisites = new Set<string>();
    for (const inputName of requiredInputNamesByTaskKey[entry.key] ?? []) {
      const sourceKey = inputTaskKeyByName[inputName];
      if (sourceKey && sourceKey !== entry.key) prerequisites.add(sourceKey);
    }
    if (prerequisites.size > 0) prerequisiteInputTaskKeysByKey[entry.key] = Array.from(prerequisites);
  }

  const unassignableInputsByPhase: Record<string, string[]> = {};
  for (let shoppingIndex = 0; shoppingIndex < shoppingItems.length; shoppingIndex += 1) {
    const item = shoppingItems[shoppingIndex];
    for (const inputName of requiredInputNamesByShoppingKey[`index:${shoppingIndex}`] ?? []) {
      if (availableInputs.has(inputName) || inputTaskKeyByName[inputName]) continue;
      const phaseKey = item.phaseId ?? "__none__";
      unassignableInputsByPhase[phaseKey] = Array.from(new Set([...(unassignableInputsByPhase[phaseKey] ?? []), inputName]));
    }
  }

  return {
    taskInputNamesByKey,
    inputTaskKeyByName,
    taskPhaseIdByKey,
    requiredInputNamesByTaskKey,
    requiredInputNamesByShoppingKey,
    unresolvedNamesByTaskKey,
    unresolvedNamesByShoppingKey,
    prerequisiteInputTaskKeysByKey,
    unassignableInputsByPhase,
    unresolvedVariableNames: Array.from(unresolved),
    availableInputNames,
  };
}

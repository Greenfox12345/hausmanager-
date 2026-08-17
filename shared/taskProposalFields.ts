export const TASK_PROPOSAL_FIELD_NAMES = [
  "name", "description", "assignedTo", "frequency", "customFrequencyDays", "repeatInterval", "repeatUnit",
  "irregularRecurrence", "monthlyRecurrenceMode", "monthlyWeekday", "monthlyOccurrence", "enableRotation",
  "requiredPersons", "dueDate", "dueTime", "durationDays", "durationMinutes", "projectIds",
  "sharedHouseholdIds", "nonResponsiblePermission", "categoryIds", "prerequisites", "followups",
] as const;

/** Liefert ausschließlich die Felder, deren normalisierte Werte tatsächlich abweichen. */
export function getChangedProposalValues(
  proposed: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(proposed).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(current[key])),
  );
}

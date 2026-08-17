export type ProposalDisplayEntry = [string, unknown];

export const recurrenceProposalFields = new Set([
  "frequency", "customFrequencyDays", "repeatInterval", "repeatUnit", "irregularRecurrence",
  "monthlyRecurrenceMode", "monthlyWeekday", "monthlyOccurrence",
]);

const dueProposalFields = new Set(["dueDate", "dueTime"]);

/** Gruppiert technische Einzelfelder zu lesbaren Wiederholungs- und Terminzeilen. */
export function buildProposalDisplayEntries(payload: Record<string, unknown>): ProposalDisplayEntry[] {
  const entries: ProposalDisplayEntry[] = Object.entries(payload).filter(([field]) => !recurrenceProposalFields.has(field) && !dueProposalFields.has(field));
  if (Object.keys(payload).some((field) => recurrenceProposalFields.has(field))) entries.push(["__recurrence", payload]);
  if (Object.keys(payload).some((field) => dueProposalFields.has(field))) entries.push(["__dueDate", payload]);
  return entries.sort(([left], [right]) => left === "name" ? -1 : right === "name" ? 1 : 0);
}

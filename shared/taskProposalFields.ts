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

export type ProposalTouchedFields = Partial<Record<
  "categoryIds" | "excludedMembers" | "prerequisites" | "followups" | "rotationSchedule",
  boolean
>>;

const complexProposalFields = new Set(["categoryIds", "excludedMembers", "prerequisites", "followups", "rotationSchedule"]);

function normalizeIdArray(value: unknown): unknown {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(Number).filter(Number.isInteger))).sort((left, right) => left - right)
    : value;
}

/** Entfernt reine Anzeige- und Berechnungsdaten aus dem lokalen Rotationsplan. */
export function normalizeProposalRotationSchedule(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((occurrence: any) => ({
    occurrenceNumber: Number(occurrence.occurrenceNumber),
    members: (occurrence.members ?? [])
      .filter((member: any) => Number(member.memberId) > 0)
      .map((member: any) => ({ position: Number(member.position), memberId: Number(member.memberId) }))
      .sort((left: { position: number }, right: { position: number }) => left.position - right.position),
    notes: occurrence.notes || "",
    isSkipped: Boolean(occurrence.isSkipped),
    isSpecial: Boolean(occurrence.isSpecial),
    specialName: occurrence.specialName || null,
    // Reguläre Termine erhalten im Editor berechnete Anzeigedaten. Diese sind
    // keine Änderung des gespeicherten Rotationsplans und werden daher ignoriert.
    occurrenceDate: occurrence.isSpecial ? (occurrence.occurrenceDate || null) : null,
    specialDate: occurrence.isSpecial ? (occurrence.specialDate || null) : null,
  }));
}

/**
 * Ermittelt Vorschlagsfelder aus einem Formularzustand, ohne asynchron geladene
 * Standardwerte oder berechnete Rotationsdaten als Änderung zu speichern.
 */
export function getStableProposalChanges(
  proposed: Record<string, unknown>,
  current: Record<string, unknown>,
  touched: ProposalTouchedFields,
): Record<string, unknown> {
  const normalizedProposed = { ...proposed };
  const normalizedCurrent = { ...current };

  for (const field of Array.from(complexProposalFields)) {
    if (!touched[field as keyof ProposalTouchedFields]) {
      delete normalizedProposed[field];
      delete normalizedCurrent[field];
      continue;
    }
    if (field === "rotationSchedule") {
      normalizedProposed[field] = normalizeProposalRotationSchedule(normalizedProposed[field]);
      normalizedCurrent[field] = normalizeProposalRotationSchedule(normalizedCurrent[field]);
    } else {
      normalizedProposed[field] = normalizeIdArray(normalizedProposed[field]);
      normalizedCurrent[field] = normalizeIdArray(normalizedCurrent[field]);
    }
  }

  // Alte Daten können Monatsdetails enthalten, obwohl weder die bestehende noch
  // die vorgeschlagene Wiederholung monatlich ist. Solche inaktiven Altwerte
  // dürfen nicht als eigenständige Änderung vorgeschlagen werden.
  const proposedIsMonthly = normalizedProposed.frequency === "monthly" || normalizedProposed.repeatUnit === "months";
  const currentIsMonthly = normalizedCurrent.frequency === "monthly" || normalizedCurrent.repeatUnit === "months";
  if (!proposedIsMonthly && !currentIsMonthly) {
    for (const field of ["monthlyRecurrenceMode", "monthlyWeekday", "monthlyOccurrence"]) {
      delete normalizedProposed[field];
      delete normalizedCurrent[field];
    }
  }

  return getChangedProposalValues(normalizedProposed, normalizedCurrent);
}

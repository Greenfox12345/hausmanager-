/**
 * Ermittelt, ob ein Mitglied eine Aufgabe unmittelbar bearbeiten darf.
 * Ohne Zuweisung ist eine Aufgabe bewusst für den gesamten Haushalt offen.
 */
export function canDirectlyManageTask(
  assignedTo: readonly number[] | number | null | undefined,
  memberId: number,
): boolean {
  const responsibleIds = Array.isArray(assignedTo)
    ? assignedTo
    : typeof assignedTo === "number"
      ? [assignedTo]
      : [];

  return responsibleIds.length === 0 || responsibleIds.includes(memberId);
}

/** Nur alle aktuell verantwortlichen Mitglieder dürfen einen Vorschlag entscheiden. */
export function canReviewTaskProposal(
  assignedTo: readonly number[] | number | null | undefined,
  memberId: number,
): boolean {
  const responsibleIds = Array.isArray(assignedTo)
    ? assignedTo
    : typeof assignedTo === "number"
      ? [assignedTo]
      : [];

  return responsibleIds.includes(memberId);
}

/**
 * Centralized multilingual activity log text generator.
 * All history entries are generated in the household's configured language (de/en/es).
 */

type Lang = "de" | "en" | "es";

function t(lang: Lang, de: string, en: string, es: string): string {
  if (lang === "en") return en;
  if (lang === "es") return es;
  return de;
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export function shoppingItemAdded(lang: Lang, itemName: string, category?: string): string {
  const cat = category ? t(lang, ` (Kategorie: ${category})`, ` (category: ${category})`, ` (categoría: ${category})`) : "";
  return t(lang,
    `Artikel „${itemName}"${cat} zur Einkaufsliste hinzugefügt`,
    `Item "${itemName}"${cat} added to shopping list`,
    `Artículo "${itemName}"${cat} añadido a la lista de compras`
  );
}

export function shoppingItemUpdated(lang: Lang, itemName: string, changes?: string): string {
  const ch = changes ? t(lang, `: ${changes}`, `: ${changes}`, `: ${changes}`) : "";
  return t(lang,
    `Artikel „${itemName}" in der Einkaufsliste aktualisiert${ch}`,
    `Shopping item "${itemName}" updated${ch}`,
    `Artículo "${itemName}" actualizado en la lista de compras${ch}`
  );
}

export function shoppingItemDeleted(lang: Lang, itemName: string): string {
  return t(lang,
    `Artikel „${itemName}" aus der Einkaufsliste entfernt`,
    `Item "${itemName}" removed from shopping list`,
    `Artículo "${itemName}" eliminado de la lista de compras`
  );
}

export function shoppingBatchCompleted(lang: Lang, count: number, listName?: string): string {
  const list = listName ? t(lang, ` aus Liste „${listName}"`, ` from list "${listName}"`, ` de la lista "${listName}"`) : "";
  return t(lang,
    `${count} Artikel${list} als eingekauft markiert`,
    `${count} item${count !== 1 ? "s" : ""}${list} marked as purchased`,
    `${count} artículo${count !== 1 ? "s" : ""}${list} marcado${count !== 1 ? "s" : ""} como comprado${count !== 1 ? "s" : ""}`
  );
}

export function shoppingCategoryAdded(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" erstellt`,
    `Shopping category "${categoryName}" created`,
    `Categoría de compras "${categoryName}" creada`
  );
}

export function shoppingCategoryUpdated(lang: Lang, oldName: string, newName: string): string {
  return t(lang,
    `Einkaufskategorie „${oldName}" in „${newName}" umbenannt`,
    `Shopping category "${oldName}" renamed to "${newName}"`,
    `Categoría de compras "${oldName}" renombrada a "${newName}"`
  );
}

export function shoppingCategoryDeleted(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" gelöscht`,
    `Shopping category "${categoryName}" deleted`,
    `Categoría de compras "${categoryName}" eliminada`
  );
}

export function shoppingTaskLinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Artikel „${itemName}" mit Aufgabe „${taskName}" verknüpft`,
    `Item "${itemName}" linked to task "${taskName}"`,
    `Artículo "${itemName}" vinculado a la tarea "${taskName}"`
  );
}

export function shoppingTaskUnlinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Verknüpfung von Artikel „${itemName}" mit Aufgabe „${taskName}" aufgehoben`,
    `Item "${itemName}" unlinked from task "${taskName}"`,
    `Artículo "${itemName}" desvinculado de la tarea "${taskName}"`
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function taskCreated(lang: Lang, taskName: string, assignees?: string[]): string {
  const who = assignees && assignees.length > 0
    ? t(lang, ` – zugewiesen an: ${assignees.join(", ")}`, ` – assigned to: ${assignees.join(", ")}`, ` – asignado a: ${assignees.join(", ")}`)
    : "";
  return t(lang,
    `Aufgabe „${taskName}" erstellt${who}`,
    `Task "${taskName}" created${who}`,
    `Tarea "${taskName}" creada${who}`
  );
}

export function taskUpdated(lang: Lang, taskName: string, changes?: string): string {
  const ch = changes ? t(lang, ` – Änderungen: ${changes}`, ` – changes: ${changes}`, ` – cambios: ${changes}`) : "";
  return t(lang,
    `Aufgabe „${taskName}" aktualisiert${ch}`,
    `Task "${taskName}" updated${ch}`,
    `Tarea "${taskName}" actualizada${ch}`
  );
}

export function taskCompleted(lang: Lang, taskName: string, memberName: string, dateStr?: string): string {
  const date = dateStr ? t(lang, ` am ${dateStr}`, ` on ${dateStr}`, ` el ${dateStr}`) : "";
  return t(lang,
    `Aufgabe „${taskName}"${date} von ${memberName} abgeschlossen`,
    `Task "${taskName}"${date} completed by ${memberName}`,
    `Tarea "${taskName}"${date} completada por ${memberName}`
  );
}

export function taskUncompleted(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Abschluss von Aufgabe „${taskName}" durch ${memberName} rückgängig gemacht`,
    `Completion of task "${taskName}" undone by ${memberName}`,
    `Finalización de la tarea "${taskName}" deshecha por ${memberName}`
  );
}

export function taskDeleted(lang: Lang, taskName: string): string {
  return t(lang,
    `Aufgabe „${taskName}" gelöscht`,
    `Task "${taskName}" deleted`,
    `Tarea "${taskName}" eliminada`
  );
}

export function taskRotated(lang: Lang, taskName: string, fromMember: string, toMember: string): string {
  return t(lang,
    `Aufgabe „${taskName}" rotiert: Verantwortung von ${fromMember} an ${toMember} übergeben`,
    `Task "${taskName}" rotated: responsibility transferred from ${fromMember} to ${toMember}`,
    `Tarea "${taskName}" rotada: responsabilidad transferida de ${fromMember} a ${toMember}`
  );
}

export function taskMilestone(lang: Lang, taskName: string, milestoneName: string): string {
  return t(lang,
    `Zwischenziel „${milestoneName}" für Aufgabe „${taskName}" erreicht`,
    `Milestone "${milestoneName}" reached for task "${taskName}"`,
    `Hito "${milestoneName}" alcanzado para la tarea "${taskName}"`
  );
}

export function taskReminder(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Erinnerung für Aufgabe „${taskName}" an ${memberName} gesendet`,
    `Reminder for task "${taskName}" sent to ${memberName}`,
    `Recordatorio para la tarea "${taskName}" enviado a ${memberName}`
  );
}

export function taskSkipped(lang: Lang, taskName: string, dateStr: string): string {
  return t(lang,
    `Termin am ${dateStr} für Aufgabe „${taskName}" übersprungen`,
    `Occurrence on ${dateStr} for task "${taskName}" skipped`,
    `Cita del ${dateStr} para la tarea "${taskName}" omitida`
  );
}

export function taskRestored(lang: Lang, taskName: string, dateStr: string): string {
  return t(lang,
    `Übersprungener Termin am ${dateStr} für Aufgabe „${taskName}" wiederhergestellt`,
    `Skipped occurrence on ${dateStr} for task "${taskName}" restored`,
    `Cita omitida del ${dateStr} para la tarea "${taskName}" restaurada`
  );
}

// ─── Borrow ──────────────────────────────────────────────────────────────────

export function borrowRequested(lang: Lang, itemName: string, requesterName: string, reason?: string): string {
  const why = reason ? t(lang, ` – Grund: ${reason}`, ` – reason: ${reason}`, ` – motivo: ${reason}`) : "";
  return t(lang,
    `${requesterName} hat eine Ausleih-Anfrage für „${itemName}" gestellt${why}`,
    `${requesterName} requested to borrow "${itemName}"${why}`,
    `${requesterName} solicitó tomar prestado "${itemName}"${why}`
  );
}

export function borrowAutoApproved(lang: Lang, itemName: string, requesterName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" automatisch genehmigt (Haushaltseigentum)`,
    `Borrow request by ${requesterName} for "${itemName}" automatically approved (household property)`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" aprobada automáticamente (propiedad del hogar)`
  );
}

export function borrowApproved(lang: Lang, itemName: string, requesterName: string, approverName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" von ${approverName} genehmigt`,
    `Borrow request by ${requesterName} for "${itemName}" approved by ${approverName}`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" aprobada por ${approverName}`
  );
}

export function borrowRejected(lang: Lang, itemName: string, requesterName: string, reason?: string): string {
  const why = reason ? t(lang, ` – Grund: ${reason}`, ` – reason: ${reason}`, ` – motivo: ${reason}`) : "";
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" abgelehnt${why}`,
    `Borrow request by ${requesterName} for "${itemName}" rejected${why}`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" rechazada${why}`
  );
}

export function borrowReturned(lang: Lang, itemName: string, returnerName: string): string {
  return t(lang,
    `„${itemName}" von ${returnerName} zurückgegeben`,
    `"${itemName}" returned by ${returnerName}`,
    `"${itemName}" devuelto por ${returnerName}`
  );
}

export function borrowRevoked(lang: Lang, itemName: string, revokerName: string, reason?: string): string {
  const why = reason ? t(lang, ` – Begründung: ${reason}`, ` – reason: ${reason}`, ` – motivo: ${reason}`) : "";
  return t(lang,
    `Ausleihgenehmigung für „${itemName}" von ${revokerName} widerrufen${why}`,
    `Borrow approval for "${itemName}" revoked by ${revokerName}${why}`,
    `Aprobación de préstamo para "${itemName}" revocada por ${revokerName}${why}`
  );
}

export function borrowCancelled(lang: Lang, itemName: string, requesterName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" storniert`,
    `Borrow request by ${requesterName} for "${itemName}" cancelled`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" cancelada`
  );
}

// ─── Task Occurrence Items ────────────────────────────────────────────────────

export function occurrenceItemAdded(lang: Lang, itemName: string, taskName: string, occurrence: number): string {
  return t(lang,
    `Gegenstand „${itemName}" für Termin ${occurrence} der Aufgabe „${taskName}" hinzugefügt`,
    `Item "${itemName}" added for occurrence ${occurrence} of task "${taskName}"`,
    `Artículo "${itemName}" añadido para la cita ${occurrence} de la tarea "${taskName}"`
  );
}

export function occurrenceItemRemoved(lang: Lang, itemName: string, taskName: string, occurrence: number): string {
  return t(lang,
    `Gegenstand „${itemName}" von Termin ${occurrence} der Aufgabe „${taskName}" entfernt`,
    `Item "${itemName}" removed from occurrence ${occurrence} of task "${taskName}"`,
    `Artículo "${itemName}" eliminado de la cita ${occurrence} de la tarea "${taskName}"`
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export function inventoryItemAdded(
  lang: Lang,
  itemName: string,
  memberName: string,
  category?: string,
  ownershipType?: "personal" | "household"
): string {
  const cat = category
    ? t(lang, ` in Kategorie „${category}"`, ` in category "${category}"`, ` en categoría "${category}"`)
    : "";
  const own =
    ownershipType === "personal"
      ? t(lang, " (persönliches Eigentum)", " (personal property)", " (propiedad personal)")
      : ownershipType === "household"
      ? t(lang, " (Haushaltseigentum)", " (household property)", " (propiedad del hogar)")
      : "";
  return t(
    lang,
    `${memberName} hat Gegenstand „${itemName}"${cat}${own} zum Inventar hinzugefügt`,
    `${memberName} added item "${itemName}"${cat}${own} to inventory`,
    `${memberName} añadió el artículo "${itemName}"${cat}${own} al inventario`
  );
}

export function inventoryItemUpdated(
  lang: Lang,
  itemName: string,
  memberName: string,
  changes?: string
): string {
  const ch = changes
    ? t(lang, ` – Änderungen: ${changes}`, ` – changes: ${changes}`, ` – cambios: ${changes}`)
    : "";
  return t(
    lang,
    `${memberName} hat Gegenstand „${itemName}" im Inventar aktualisiert${ch}`,
    `${memberName} updated item "${itemName}" in inventory${ch}`,
    `${memberName} actualizó el artículo "${itemName}" en el inventario${ch}`
  );
}

export function inventoryItemDeleted(
  lang: Lang,
  itemName: string,
  memberName: string
): string {
  return t(
    lang,
    `${memberName} hat Gegenstand „${itemName}" aus dem Inventar gelöscht`,
    `${memberName} deleted item "${itemName}" from inventory`,
    `${memberName} eliminó el artículo "${itemName}" del inventario`
  );
}

export function inventoryCategoryAdded(lang: Lang, categoryName: string, memberName: string): string {
  return t(
    lang,
    `${memberName} hat Inventarkategorie „${categoryName}" erstellt`,
    `${memberName} created inventory category "${categoryName}"`,
    `${memberName} creó la categoría de inventario "${categoryName}"`
  );
}

export function inventoryCategoryUpdated(lang: Lang, oldName: string, newName: string, memberName: string): string {
  return t(
    lang,
    `${memberName} hat Inventarkategorie „${oldName}" in „${newName}" umbenannt`,
    `${memberName} renamed inventory category "${oldName}" to "${newName}"`,
    `${memberName} renombró la categoría de inventario "${oldName}" a "${newName}"`
  );
}

export function inventoryCategoryDeleted(lang: Lang, categoryName: string, memberName: string): string {
  return t(
    lang,
    `${memberName} hat Inventarkategorie „${categoryName}" gelöscht`,
    `${memberName} deleted inventory category "${categoryName}"`,
    `${memberName} eliminó la categoría de inventario "${categoryName}"`
  );
}

// ─── Household / Member ───────────────────────────────────────────────────────

export function memberJoined(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} ist dem Haushalt beigetreten`,
    `${memberName} joined the household`,
    `${memberName} se unió al hogar`
  );
}

export function memberLeft(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} hat den Haushalt verlassen`,
    `${memberName} left the household`,
    `${memberName} abandonó el hogar`
  );
}

export function memberLeftNewAdmin(lang: Lang, memberName: string, newAdminName: string): string {
  return t(lang,
    `${memberName} hat den Haushalt verlassen – neuer Admin: ${newAdminName}`,
    `${memberName} left the household – new admin: ${newAdminName}`,
    `${memberName} abandonó el hogar – nuevo administrador: ${newAdminName}`
  );
}

export function adminTransferred(lang: Lang, fromMember: string, toMember: string): string {
  return t(lang,
    `Admin-Rechte von ${fromMember} an ${toMember} übertragen`,
    `Admin rights transferred from ${fromMember} to ${toMember}`,
    `Derechos de administrador transferidos de ${fromMember} a ${toMember}`
  );
}

export function dissolveVoteCast(lang: Lang, memberName: string, votesCount: number, votesNeeded: number): string {
  return t(lang,
    `${memberName} hat für die Auflösung des Haushalts gestimmt (${votesCount}/${votesNeeded} Stimmen)`,
    `${memberName} voted to dissolve the household (${votesCount}/${votesNeeded} votes)`,
    `${memberName} votó por disolver el hogar (${votesCount}/${votesNeeded} votos)`
  );
}

export function dissolveVoteRetracted(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} hat die Stimme zur Haushaltsauflösung zurückgezogen`,
    `${memberName} retracted the vote to dissolve the household`,
    `${memberName} retiró el voto para disolver el hogar`
  );
}

export function householdLanguageChanged(lang: Lang, adminName: string, newLang: string): string {
  const langName = (l: string) => {
    if (l === "de") return t(lang, "Deutsch", "German", "Alemán");
    if (l === "en") return t(lang, "Englisch", "English", "Inglés");
    if (l === "es") return t(lang, "Spanisch", "Spanish", "Español");
    return l;
  };
  return t(lang,
    `${adminName} hat die Haushaltssprache auf ${langName(newLang)} geändert`,
    `${adminName} changed the household language to ${langName(newLang)}`,
    `${adminName} cambió el idioma del hogar a ${langName(newLang)}`
  );
}

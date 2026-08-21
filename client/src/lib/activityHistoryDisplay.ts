import type { TFunction } from "i18next";

type ChangeDirection = "old" | "new";

const actionFallbacks: Record<string, string> = {
  created: "Erstellt",
  updated: "Aktualisiert",
  update: "Rotationsplan aktualisiert",
  completed: "Abgeschlossen",
  uncompleted: "Als offen markiert",
  deleted: "Gelöscht",
  milestone: "Zwischenziel erfasst",
  variable_input: "Variableneingabe",
  reminder: "Erinnerung gesendet",
  skipped: "Termin übersprungen",
  restored: "Termin wiederhergestellt",
  commented: "Kommentar hinzugefügt",
  change_proposed: "Änderung vorgeschlagen",
  change_proposal_withdrawn: "Änderungsvorschlag zurückgezogen",
  change_proposal_approved: "Änderungsvorschlag angenommen",
  change_proposal_rejected: "Änderungsvorschlag abgelehnt",
  balance_entry_created: "Bilanzaufwand erfasst",
  balance_entry_updated: "Bilanzaufwand aktualisiert",
  balance_entry_deleted: "Bilanzaufwand gelöscht",
};

const weekdayKeys: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const occurrenceKeys: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};

/** Übersetzt technische Aktivitätscodes für Badges im Verlauf. */
export function formatActivityAction(t: TFunction, action: string): string {
  return t(`history:actions.${action}`, actionFallbacks[action] ?? action);
}

/** Liefert den gespeicherten alten oder neuen Wert, bevorzugt bereits aufgelöste Namen. */
export function getHistoryChangeValue(change: any, direction: ChangeDirection): unknown {
  return direction === "old"
    ? (change?.oldNames ?? change?.old)
    : (change?.newNames ?? change?.new);
}

/** Formatiert technische Feldwerte aus dem Aufgabenverlauf lesbar und lokalisiert. */
export function formatTaskHistoryValue(
  t: TFunction,
  field: string,
  value: unknown,
  resolveArrayValue?: (value: unknown) => string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? t("common:yes", "Ja") : t("common:no", "Nein");
  if (Array.isArray(value)) return value.map((entry) => resolveArrayValue?.(entry) ?? String(entry)).join(", ") || "—";

  switch (field) {
    case "frequency":
      return t(`tasks:frequency.${String(value)}`, String(value));
    case "repeatUnit":
      return t(`tasks:repeat.${String(value)}`, String(value));
    case "monthlyRecurrenceMode":
      if (value === "same_date") return t("tasks:repeat.sameDate", "Am gleichen Kalendertag");
      if (value === "same_weekday") return t("tasks:repeat.sameWeekday", "Am gleichen Wochentag");
      return String(value);
    case "monthlyWeekday": {
      const key = weekdayKeys[Number(value)];
      return key ? t(`tasks:weekdays.${key}`, String(value)) : String(value);
    }
    case "monthlyOccurrence": {
      if (Number(value) === 5) return t("tasks:weekdays.last", "Letzter");
      const key = occurrenceKeys[Number(value)];
      return key ? t(`tasks:repeat.${key}`, String(value)) : String(value);
    }
    case "customFrequencyDays":
    case "durationDays":
      return t("tasks:repeat.daysN", "{{count}} Tage", { count: Number(value) });
    case "durationMinutes":
      return t("history:values.minutes", "{{count}} Minuten", { count: Number(value) });
    case "nonResponsiblePermission":
      if (value === "full") return t("tasks:dialog.fullAccess", "Vollzugriff (alles bearbeiten)");
      if (value === "milestones_reminders") return t("tasks:dialog.milestonesReminders", "Zwischenziele & Erinnerungen");
      if (value === "view_only") return t("tasks:dialog.viewOnly", "Nur ansehen");
      return String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

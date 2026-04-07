import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { getDateFnsLocaleSync } from "@/lib/i18n";
import { Calendar, User, FileText, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface UpcomingOccurrence {
  occurrenceNumber: number;
  date?: Date;
  time?: string;
  responsiblePersons: string[];
  notes?: string;
  isSkipped?: boolean;
  isSpecial?: boolean;
  specialName?: string;
  // For inline editing
  memberIds?: number[];
}

interface Member {
  memberId: number;
  memberName: string;
}

interface UpcomingOccurrencesTableProps {
  occurrences: UpcomingOccurrence[];
  /** If provided, enables inline editing of responsible persons */
  members?: Member[];
  /** Required number of persons per occurrence */
  requiredPersons?: number;
  /** Called when responsible persons are changed inline */
  onMembersChange?: (occurrenceNumber: number, memberIds: number[]) => void;
  /** Called when notes are changed inline */
  onNotesChange?: (occurrenceNumber: number, notes: string) => void;
}

export function UpcomingOccurrencesTable({
  occurrences,
  members = [],
  requiredPersons = 1,
  onMembersChange,
  onNotesChange,
}: UpcomingOccurrencesTableProps) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocaleSync(i18n.language);

  // Inline editing state: { occurrenceNumber -> { memberIds, notes } }
  const [editingNotes, setEditingNotes] = useState<Record<number, string | null>>({});

  if (occurrences.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t("tasks:upcomingOccurrences.empty")}</p>
      </div>
    );
  }

  const canEdit = onMembersChange !== undefined || onNotesChange !== undefined;

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {occurrences.map((occ) => {
            const isEditingNote = editingNotes[occ.occurrenceNumber] !== null && editingNotes[occ.occurrenceNumber] !== undefined;
            const noteValue = isEditingNote ? editingNotes[occ.occurrenceNumber]! : (occ.notes || "");

            return (
              <tr
                key={occ.occurrenceNumber}
                className={`border-t first:border-t-0 ${occ.isSkipped ? "opacity-60" : ""} ${occ.isSpecial ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
              >
                {/* Nr. */}
                <td className={`px-2 py-1.5 font-medium w-8 text-center ${occ.isSkipped ? "line-through" : ""} ${occ.isSpecial ? "text-yellow-700 dark:text-yellow-500" : "text-muted-foreground"}`}>
                  {occ.isSpecial && occ.specialName ? (
                    <span className="text-xs leading-tight">{occ.specialName}</span>
                  ) : (
                    occ.occurrenceNumber
                  )}
                </td>

                {/* Datum + Uhrzeit */}
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {occ.date ? (
                    <span className={`${occ.isSkipped ? "line-through" : ""}`}>
                      {format(occ.date, "EEE, dd.MM.yy", { locale: dateFnsLocale })}
                      {occ.time && occ.time !== "00:00" && (
                        <span className="text-muted-foreground ml-1">{occ.time}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">{t("tasks:upcomingOccurrences.noDate")}</span>
                  )}
                </td>

                {/* Verantwortliche */}
                <td className="px-2 py-1.5">
                  {canEdit && onMembersChange && members.length > 0 ? (
                    // Inline-editable member selects
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: requiredPersons }, (_, i) => {
                        const currentId = occ.memberIds?.[i] ?? 0;
                        const assignedOtherIds = (occ.memberIds || []).filter((_, idx) => idx !== i);
                        return (
                          <Select
                            key={i}
                            value={String(currentId)}
                            onValueChange={(val) => {
                              const newIds = Array.from({ length: requiredPersons }, (_, idx) =>
                                idx === i ? parseInt(val) : (occ.memberIds?.[idx] ?? 0)
                              );
                              onMembersChange(occ.occurrenceNumber, newIds);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-[100px] max-w-[140px]">
                              <SelectValue placeholder={t("tasks:memberSelect.open")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">{t("tasks:memberSelect.open")}</SelectItem>
                              {members.map((m) => (
                                <SelectItem
                                  key={m.memberId}
                                  value={String(m.memberId)}
                                  disabled={assignedOtherIds.includes(m.memberId)}
                                >
                                  {m.memberName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })}
                    </div>
                  ) : (
                    // Read-only display
                    occ.responsiblePersons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {occ.responsiblePersons.map((person, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">{t("tasks:upcomingOccurrences.open")}</span>
                    )
                  )}
                </td>

                {/* Notizen */}
                <td className="px-2 py-1.5 max-w-[180px]">
                  {canEdit && onNotesChange ? (
                    isEditingNote ? (
                      <div className="flex flex-col gap-1">
                        <Textarea
                          value={noteValue}
                          onChange={(e) => setEditingNotes(prev => ({ ...prev, [occ.occurrenceNumber]: e.target.value }))}
                          className="min-h-[52px] text-xs resize-none"
                          autoFocus
                          onBlur={() => {
                            onNotesChange(occ.occurrenceNumber, noteValue);
                            setEditingNotes(prev => { const n = { ...prev }; delete n[occ.occurrenceNumber]; return n; });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingNotes(prev => { const n = { ...prev }; delete n[occ.occurrenceNumber]; return n; });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1 py-0.5 min-h-[24px] transition-colors"
                        onClick={() => setEditingNotes(prev => ({ ...prev, [occ.occurrenceNumber]: occ.notes || "" }))}
                        title={t("tasks:upcomingOccurrences.editNote", "Notiz bearbeiten")}
                      >
                        {occ.notes ? (
                          <span className="line-clamp-2">{occ.notes}</span>
                        ) : (
                          <span className="italic opacity-50">{t("tasks:upcomingOccurrences.addNote", "Notiz hinzufügen…")}</span>
                        )}
                      </button>
                    )
                  ) : (
                    occ.notes ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{occ.notes}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

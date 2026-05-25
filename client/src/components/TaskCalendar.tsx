import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, setMonth, setYear, isPast } from "date-fns";
import { getDateFnsLocaleSync } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Star, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskOccurrence {
  /** Unique key: taskId + occurrenceNumber (or "event-id") */
  key: string;
  taskId: number;
  taskName: string;
  /** The date this occurrence falls on */
  date: Date;
  isCompleted: boolean;
  isSkipped: boolean;
  isSpecial: boolean;
  specialName?: string;
  isFutureOccurrence: boolean;
  isCompletedOccurrence: boolean;
  isCalendarEvent: boolean;
  eventType?: string;
  repeatUnit?: string | null;
  occurrenceNote?: string | null;
  /** Raw task object for the detail card */
  raw: any;
}

interface TaskBar {
  occ: TaskOccurrence;
  startCol: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  rowIndex: number;
}

interface SelectedInfo {
  occ: TaskOccurrence;
  weekIndex: number;
}

interface TaskCalendarProps {
  occurrences: TaskOccurrence[];
  onTaskClick?: (occ: TaskOccurrence) => void;
  /** Render a detail card for the selected occurrence */
  renderDetail?: (occ: TaskOccurrence, onClose: () => void) => React.ReactNode;
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function getBarColor(occ: TaskOccurrence): { bar: string; text: string; striped?: boolean } {
  if (occ.isCalendarEvent) {
    return occ.eventType === "borrow_start"
      ? { bar: "bg-orange-500", text: "text-white" }
      : occ.eventType === "borrow_return"
      ? { bar: "bg-amber-500", text: "text-white" }
      : { bar: "bg-gray-400", text: "text-white" };
  }
  if (occ.isSkipped) return { bar: "bg-gray-300", text: "text-gray-500", striped: true };
  if (occ.isCompleted || occ.isCompletedOccurrence) return { bar: "bg-green-500", text: "text-white" };
  if (occ.isSpecial) return { bar: "bg-amber-400", text: "text-white" };
  if (occ.isFutureOccurrence) return { bar: "bg-purple-400", text: "text-white" };
  const d = occ.date;
  d.setHours(0, 0, 0, 0);
  if (isPast(d)) return { bar: "bg-red-400", text: "text-white" };
  return { bar: "bg-blue-500", text: "text-white" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskCalendar({ occurrences, onTaskClick, renderDetail }: TaskCalendarProps) {
  const { t, i18n } = useTranslation(["calendar", "common"]);
  const dateFnsLocale = getDateFnsLocaleSync(i18n.language);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<SelectedInfo | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Filter occurrences to those visible in this month view
  const visibleOccs = useMemo(() =>
    occurrences.filter(o => {
      const d = new Date(o.date);
      return d >= calendarStart && d <= calendarEnd;
    }),
    [occurrences, calendarStart, calendarEnd]
  );

  // Build week bars (single-day spans – tasks have one date each)
  const weekBars = useMemo(() => {
    return weeks.map(week => {
      const weekStart = week[0];
      const weekEnd = week[6];

      const inWeek = visibleOccs.filter(o => {
        const d = new Date(o.date);
        return d >= weekStart && d <= weekEnd;
      });

      const rows: TaskOccurrence[][] = [];
      const bars: TaskBar[] = [];

      inWeek.forEach(occ => {
        const d = new Date(occ.date);
        const startCol = week.findIndex(day => isSameDay(day, d));
        if (startCol === -1) return;
        const span = 1;

        let rowIndex = 0;
        while (rows[rowIndex]?.some(existing => {
          const eCol = week.findIndex(day => isSameDay(day, new Date(existing.date)));
          return startCol <= eCol && startCol + span - 1 >= eCol;
        })) {
          rowIndex++;
        }
        if (!rows[rowIndex]) rows[rowIndex] = [];
        rows[rowIndex].push(occ);

        bars.push({ occ, startCol, span, isStart: true, isEnd: true, rowIndex });
      });

      return { week, bars, rowCount: rows.length };
    });
  }, [weeks, visibleOccs]);

  const goToPrevMonth = () => { setCurrentMonth(m => subMonths(m, 1)); setSelected(null); };
  const goToNextMonth = () => { setCurrentMonth(m => addMonths(m, 1)); setSelected(null); };
  const goToToday = () => { setCurrentMonth(new Date()); setSelected(null); };

  const DAY_HEADERS = Array.from({ length: 7 }, (_, i) => {
    const refDate = new Date(2023, 0, 2 + i); // Mon … Sun
    return format(refDate, "EEEEEE", { locale: dateFnsLocale });
  });

  const handleBarClick = (occ: TaskOccurrence, weekIndex: number) => {
    if (selected?.occ.key === occ.key && selected?.weekIndex === weekIndex) {
      setSelected(null);
    } else {
      setSelected({ occ, weekIndex });
      onTaskClick?.(occ);
    }
  };

  // Legend entries
  const LEGEND = [
    { label: t("calendar:legend.open", "Offen"), color: "bg-blue-500" },
    { label: t("calendar:legend.overdue", "Überfällig"), color: "bg-red-400" },
    { label: t("calendar:legend.completed", "Erledigt"), color: "bg-green-500" },
    { label: t("calendar:legend.future", "Folgetermin"), color: "bg-purple-400" },
    { label: t("calendar:legend.special", "Sondertermin"), color: "bg-amber-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 text-lg font-semibold flex-1 justify-center hover:opacity-70 transition-opacity rounded px-2 py-1"
                title={t("common:labels.selectMonthYear", "Monat und Jahr auswählen")}
              >
                {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 space-y-3" align="center">
              <p className="text-sm font-medium text-center">{t("common:labels.selectMonthYear", "Monat und Jahr auswählen")}</p>
              <div className="flex gap-2">
                <Select
                  value={String(currentMonth.getMonth())}
                  onValueChange={(val) => setCurrentMonth(prev => setMonth(prev, parseInt(val)))}
                >
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {format(setMonth(new Date(), i), "MMMM", { locale: dateFnsLocale })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(currentMonth.getFullYear())}
                  onValueChange={(val) => setCurrentMonth(prev => setYear(prev, parseInt(val)))}
                >
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full" onClick={() => setMonthPickerOpen(false)}>
                {t("common:actions.apply", "Übernehmen")}
              </Button>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="shrink-0">
          <Calendar className="w-4 h-4 mr-1" /> {t("common:labels.today", "Heute")}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-sm border"
            style={{
              background: "repeating-linear-gradient(45deg, #d1d5db, #d1d5db 3px, #ffffff 3px, #ffffff 6px)",
              borderColor: "#9ca3af",
            }}
          />
          <span className="text-muted-foreground">{t("calendar:legend.skipped", "Übersprungen")}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {weekBars.map(({ week, bars, rowCount }, wi) => {
          const barHeight = 22;
          const minCellHeight = 52;
          const cellHeight = Math.max(minCellHeight, 32 + rowCount * barHeight);
          const isSelectedWeek = selected?.weekIndex === wi;

          return (
            <div key={wi}>
              <div
                className={`grid grid-cols-7 border-b relative ${isSelectedWeek ? "border-b-0" : ""}`}
                style={{ minHeight: cellHeight }}
              >
                {/* Day number cells */}
                {week.map((day, di) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isCurrentDay = isToday(day);
                  return (
                    <div
                      key={di}
                      className={`border-r last:border-r-0 pt-1 px-1 relative ${!isCurrentMonth ? "bg-muted/20" : ""}`}
                      style={{ minHeight: cellHeight }}
                    >
                      <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                        ${isCurrentDay ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}

                {/* Task bars */}
                {bars.map((bar, bi) => {
                  const colors = getBarColor(bar.occ);
                  const topOffset = 28 + bar.rowIndex * barHeight;
                  const leftPct = (bar.startCol / 7) * 100;
                  const widthPct = (bar.span / 7) * 100;
                  const isActive = selected?.occ.key === bar.occ.key && isSelectedWeek;

                  return (
                    <div
                      key={bi}
                      className={`absolute z-10 flex items-center cursor-pointer transition-all overflow-hidden
                        ${colors.striped ? "" : colors.bar} ${colors.text}
                        rounded-md mx-0.5
                        ${isActive ? "ring-2 ring-offset-1 ring-white/70 opacity-100" : "hover:opacity-80"}
                      `}
                      style={{
                        top: topOffset,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        height: barHeight - 3,
                        ...(colors.striped ? {
                          background: "repeating-linear-gradient(45deg, #d1d5db, #d1d5db 4px, #ffffff 4px, #ffffff 8px)",
                          border: "1px solid #9ca3af",
                        } : {}),
                      }}
                      onClick={() => handleBarClick(bar.occ, wi)}
                      title={bar.occ.taskName}
                    >
                      <span className="truncate text-[11px] font-medium px-1.5 leading-none select-none flex items-center gap-1">
                        {bar.occ.isSpecial && <Star className="w-2.5 h-2.5 shrink-0" />}
                        {bar.occ.isCompleted || bar.occ.isCompletedOccurrence
                          ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          : null}
                        {bar.occ.taskName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Inline detail card */}
              {isSelectedWeek && selected && renderDetail && (
                <div className="border-b border-x rounded-b-lg mx-0 p-3 bg-card shadow-md animate-in slide-in-from-top-2 duration-150">
                  {renderDetail(selected.occ, () => setSelected(null))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visibleOccs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t("calendar:noEvents", "Keine Termine in diesem Monat")}</p>
        </div>
      )}
    </div>
  );
}

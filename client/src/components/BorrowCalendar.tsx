import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorrowCard, type BorrowCardData } from "@/components/BorrowCard";

type BorrowEntry = BorrowCardData;

interface BorrowCalendarProps {
  borrows: BorrowEntry[];
  onPickup?: (borrow: BorrowCardData) => void;
  onReturn?: (borrow: BorrowCardData) => void;
  onCancel?: (borrow: BorrowCardData, reason?: string) => void;
  isCancelling?: boolean;
}

const STATUS_COLORS: Record<string, { bar: string; text: string; striped?: boolean }> = {
  active:    { bar: "bg-green-500",  text: "text-white" },
  approved:  { bar: "bg-blue-500",   text: "text-white" },
  pending:   { bar: "bg-amber-400",  text: "text-white" },
  returned:  { bar: "bg-gray-500",   text: "text-white" },
  completed: { bar: "bg-gray-500",   text: "text-white" },
  rejected:  { bar: "bg-red-400",    text: "text-white" },
  cancelled: { bar: "bg-gray-300",   text: "text-gray-600", striped: true },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.completed;
}

interface BorrowBar {
  borrow: BorrowEntry;
  startCol: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  rowIndex: number;
}

interface SelectedInfo {
  borrow: BorrowEntry;
  weekIndex: number;
}

export function BorrowCalendar({ borrows, onPickup, onReturn, onCancel, isCancelling }: BorrowCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<SelectedInfo | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const normalizedBorrows = useMemo(() => borrows.map(b => ({
    ...b,
    startDate: new Date(b.startDate),
    endDate: new Date(b.endDate),
  })), [borrows]);

  const weekBars = useMemo(() => {
    return weeks.map(week => {
      const weekStart = week[0];
      const weekEnd = week[6];

      const overlapping = normalizedBorrows.filter(b =>
        b.startDate <= weekEnd && b.endDate >= weekStart
      );

      const rows: BorrowEntry[][] = [];
      const bars: BorrowBar[] = [];

      overlapping.forEach(borrow => {
        const barStart = borrow.startDate < weekStart ? weekStart : borrow.startDate;
        const barEnd = borrow.endDate > weekEnd ? weekEnd : borrow.endDate;

        const startCol = week.findIndex(d => isSameDay(d, barStart));
        const endCol = week.findIndex(d => isSameDay(d, barEnd));
        const span = endCol - startCol + 1;

        let rowIndex = 0;
        while (rows[rowIndex]?.some(existing => {
          const eStart = existing.startDate < weekStart ? weekStart : existing.startDate;
          const eEnd = existing.endDate > weekEnd ? weekEnd : existing.endDate;
          const eStartCol = week.findIndex(d => isSameDay(d, eStart));
          const eEndCol = week.findIndex(d => isSameDay(d, eEnd));
          return startCol <= eEndCol && endCol >= eStartCol;
        })) {
          rowIndex++;
        }
        if (!rows[rowIndex]) rows[rowIndex] = [];
        rows[rowIndex].push(borrow);

        bars.push({
          borrow,
          startCol,
          span,
          isStart: isSameDay(borrow.startDate, barStart),
          isEnd: isSameDay(borrow.endDate, barEnd),
          rowIndex,
        });
      });

      return { week, bars, rowCount: rows.length };
    });
  }, [weeks, normalizedBorrows]);

  const goToPrevMonth = () => {
    setCurrentMonth(m => subMonths(m, 1));
    setSelected(null);
  };
  const goToNextMonth = () => {
    setCurrentMonth(m => addMonths(m, 1));
    setSelected(null);
  };
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelected(null);
  };

  const DAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const handleBarClick = (borrow: BorrowEntry, weekIndex: number) => {
    if (selected?.borrow.id === borrow.id && selected?.weekIndex === weekIndex) {
      setSelected(null);
    } else {
      setSelected({ borrow, weekIndex });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: de })}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          <Calendar className="w-4 h-4 mr-1" /> Heute
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS)
          .filter(([status]) => status !== "completed")
          .map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded-sm ${colors.striped ? "" : colors.bar} border`}
              style={colors.striped ? {
                background: "repeating-linear-gradient(45deg, #d1d5db, #d1d5db 3px, #ffffff 3px, #ffffff 6px)",
                borderColor: "#9ca3af",
              } : { borderColor: "transparent" }}
            />
            <span className="text-muted-foreground">
              {status === "active" ? "Aktiv" :
               status === "approved" ? "Genehmigt" :
               status === "pending" ? "Ausstehend" :
               status === "returned" ? "Zurückgegeben" :
               status === "rejected" ? "Abgelehnt" : "Storniert"}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_HEADERS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks – rendered as a flat list so we can inject the detail card between rows */}
        {weekBars.map(({ week, bars, rowCount }, wi) => {
          const barHeight = 22;
          const minCellHeight = 52;
          const cellHeight = Math.max(minCellHeight, 32 + rowCount * barHeight);
          const isSelectedWeek = selected?.weekIndex === wi;

          return (
            <div key={wi}>
              {/* Week row */}
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
                      className={`border-r last:border-r-0 pt-1 px-1 relative
                        ${!isCurrentMonth ? "bg-muted/20" : ""}
                      `}
                      style={{ minHeight: cellHeight }}
                    >
                      <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                        ${isCurrentDay ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                      `}>
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}

                {/* Borrow bars */}
                {bars.map((bar, bi) => {
                  const colors = getStatusColor(bar.borrow.status);
                  const topOffset = 28 + bar.rowIndex * barHeight;
                  const leftPct = (bar.startCol / 7) * 100;
                  const widthPct = (bar.span / 7) * 100;
                  const isActive = selected?.borrow.id === bar.borrow.id && isSelectedWeek;

                return (
                  <div
                    key={bi}
                    className={`absolute z-10 flex items-center cursor-pointer transition-all overflow-hidden
                      ${colors.striped ? "" : colors.bar} ${colors.text}
                      ${bar.isStart ? "rounded-l-md ml-0.5" : ""}
                      ${bar.isEnd ? "rounded-r-md mr-0.5" : ""}
                      ${isActive ? "ring-2 ring-offset-1 ring-white/70 opacity-100" : "hover:opacity-80"}
                    `}
                    style={{
                      top: topOffset,
                      left: `calc(${leftPct}% + ${bar.isStart ? 2 : 0}px)`,
                      width: `calc(${widthPct}% - ${(bar.isStart ? 2 : 0) + (bar.isEnd ? 2 : 0)}px)`,
                      height: barHeight - 3,
                      ...(colors.striped ? {
                        background: "repeating-linear-gradient(45deg, #d1d5db, #d1d5db 4px, #ffffff 4px, #ffffff 8px)",
                        border: "1px solid #9ca3af",
                      } : {}),
                    }}
                      onClick={() => handleBarClick(bar.borrow, wi)}
                      title={`${bar.borrow.itemName} (${format(new Date(bar.borrow.startDate), "dd.MM.")} – ${format(new Date(bar.borrow.endDate), "dd.MM.")})`}
                    >
                      {bar.isStart && (
                        <span className="truncate text-[11px] font-medium px-1.5 leading-none select-none">
                          {bar.borrow.itemName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Inline detail card – appears directly below this week row */}
              {isSelectedWeek && selected && (
                <div className="border-b border-x rounded-b-lg mx-0 p-3 bg-card shadow-md animate-in slide-in-from-top-2 duration-150">
                  <BorrowCard
                    borrow={selected.borrow}
                    onClose={() => setSelected(null)}
                    onPickup={onPickup}
                    onReturn={onReturn}
                    onCancel={onCancel ? (b, reason) => { onCancel(b, reason); setSelected(null); } : undefined}
                    isCancelling={isCancelling}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {normalizedBorrows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Keine Ausleihen vorhanden</p>
        </div>
      )}
    </div>
  );
}

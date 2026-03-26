import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorrowCard, type BorrowCardData } from "@/components/BorrowCard";

type BorrowEntry = BorrowCardData;

interface BorrowCalendarProps {
  borrows: BorrowEntry[];
  onPickup?: (borrow: BorrowCardData) => void;
  onReturn?: (borrow: BorrowCardData) => void;
}

// Color palette for borrow bars (cycles through if many items)
const STATUS_COLORS: Record<string, { bar: string; text: string; dot: string }> = {
  active:    { bar: "bg-green-500",  text: "text-white", dot: "bg-green-500" },
  approved:  { bar: "bg-blue-500",   text: "text-white", dot: "bg-blue-500" },
  pending:   { bar: "bg-amber-400",  text: "text-white", dot: "bg-amber-400" },
  returned:  { bar: "bg-gray-400",   text: "text-white", dot: "bg-gray-400" },
  rejected:  { bar: "bg-red-400",    text: "text-white", dot: "bg-red-400" },
  cancelled: { bar: "bg-gray-300",   text: "text-gray-600", dot: "bg-gray-300" },
};

const ITEM_COLORS = [
  "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  "bg-orange-500", "bg-indigo-500", "bg-rose-500", "bg-emerald-500",
];

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.active;
}

// Assign a stable color per item name (for multi-item differentiation)
function getItemColor(itemName: string, allNames: string[]) {
  const idx = allNames.indexOf(itemName);
  return ITEM_COLORS[idx % ITEM_COLORS.length];
}

interface BorrowBar {
  borrow: BorrowEntry;
  startCol: number; // 0-indexed day in the week row
  span: number;     // how many days this bar spans in this row
  isStart: boolean;
  isEnd: boolean;
  rowIndex: number; // vertical stacking index within the day
}

export function BorrowCalendar({ borrows, onPickup, onReturn }: BorrowCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowEntry | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Build calendar grid: weeks as rows, each week = 7 days
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Split into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Normalize borrows to Date objects
  const normalizedBorrows = useMemo(() => borrows.map(b => ({
    ...b,
    startDate: new Date(b.startDate),
    endDate: new Date(b.endDate),
  })), [borrows]);

  const allItemNames = useMemo(() => Array.from(new Set(normalizedBorrows.map(b => b.itemName))), [normalizedBorrows]);

  // For each week, compute which borrows span into it and their stacking rows
  const weekBars = useMemo(() => {
    return weeks.map(week => {
      const weekStart = week[0];
      const weekEnd = week[6];

      // Find borrows that overlap this week
      const overlapping = normalizedBorrows.filter(b =>
        b.startDate <= weekEnd && b.endDate >= weekStart
      );

      // Assign stacking rows (greedy interval scheduling)
      const rows: BorrowEntry[][] = [];
      const bars: BorrowBar[] = [];

      overlapping.forEach(borrow => {
        const barStart = borrow.startDate < weekStart ? weekStart : borrow.startDate;
        const barEnd = borrow.endDate > weekEnd ? weekEnd : borrow.endDate;

        // Find which column (0-6) these dates fall on
        const startCol = week.findIndex(d => isSameDay(d, barStart));
        const endCol = week.findIndex(d => isSameDay(d, barEnd));
        const span = endCol - startCol + 1;

        // Find a free row
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

  const goToPrevMonth = () => setCurrentMonth(m => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth(m => addMonths(m, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const DAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

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
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${colors.bar}`} />
            <span className="text-muted-foreground capitalize">
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

        {/* Weeks */}
        {weekBars.map(({ week, bars, rowCount }, wi) => {
          const barHeight = 22; // px per bar row
          const minCellHeight = 52;
          const cellHeight = Math.max(minCellHeight, 32 + rowCount * barHeight);

          return (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 relative" style={{ minHeight: cellHeight }}>
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

              {/* Borrow bars – absolutely positioned over the week row */}
              {bars.map((bar, bi) => {
                const colors = getStatusColor(bar.borrow.status);
                const topOffset = 28 + bar.rowIndex * barHeight; // below day numbers
                const leftPct = (bar.startCol / 7) * 100;
                const widthPct = (bar.span / 7) * 100;

                return (
                  <div
                    key={bi}
                    className={`absolute z-10 flex items-center cursor-pointer transition-opacity hover:opacity-80
                      ${colors.bar} ${colors.text}
                      ${bar.isStart ? "rounded-l-md ml-0.5" : ""}
                      ${bar.isEnd ? "rounded-r-md mr-0.5" : ""}
                    `}
                    style={{
                      top: topOffset,
                      left: `calc(${leftPct}% + ${bar.isStart ? 2 : 0}px)`,
                      width: `calc(${widthPct}% - ${(bar.isStart ? 2 : 0) + (bar.isEnd ? 2 : 0)}px)`,
                      height: barHeight - 3,
                    }}
                    onClick={() => setSelectedBorrow(bar.borrow)}
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
          );
        })}
      </div>

      {/* Detail card for selected borrow */}
      {selectedBorrow && (
        <BorrowCard
          borrow={selectedBorrow}
          onClose={() => setSelectedBorrow(null)}
          onPickup={onPickup}
          onReturn={onReturn}
        />
      )}

      {normalizedBorrows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Keine Ausleihen vorhanden</p>
        </div>
      )}
    </div>
  );
}

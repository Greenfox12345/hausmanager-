import { useMemo } from "react";
import { format, differenceInDays, startOfDay, addDays, min, max } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Target, ArrowRight } from "lucide-react";

interface Task {
  id: number;
  name: string;
  dueDate: Date | null;
  isCompleted: boolean;
  assignedTo: number[] | null; // Array of member IDs
  enableRotation?: boolean;
  repeatInterval?: number | null;
  repeatUnit?: string | null;
}

interface Member {
  id: number;
  memberName: string;
}

interface GanttChartViewProps {
  tasks: Task[];
  members: Member[];
}

export default function GanttChartView({ tasks, members }: GanttChartViewProps) {

  
  const getMemberName = (memberId: number | null) => {
    if (!memberId) return "Nicht zugewiesen";
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || "Unbekannt";
  };
  
  const getMemberNames = (memberIds: number[] | number | string | null | undefined) => {
    if (memberIds === null || memberIds === undefined) return "Nicht zugewiesen";
    let ids: number[] = [];
    if (Array.isArray(memberIds)) {
      ids = memberIds;
    } else if (typeof memberIds === 'number') {
      ids = [memberIds];
    } else if (typeof memberIds === 'string') {
      try {
        const parsed = JSON.parse(memberIds);
        ids = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        ids = [];
      }
    }
    if (ids.length === 0) return "Nicht zugewiesen";
    return ids.map(id => {
      const memberData = members.find((m) => m.id === id);
      return memberData?.memberName || "Unbekannt";
    }).join(", ");
  };

  // Calculate date range for Gantt chart
  const { minDate, maxDate, totalDays } = useMemo(() => {

    const tasksWithDates = tasks.filter(t => t.dueDate);
    
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return {
        minDate: today,
        maxDate: addDays(today, 30),
        totalDays: 30,
      };
    }

    const dates = tasksWithDates.map(t => startOfDay(new Date(t.dueDate!)));
    const earliest = min(dates);
    const latest = max(dates);
    
    // Add buffer days
    const bufferedMin = addDays(earliest, -3);
    const bufferedMax = addDays(latest, 7);
    const days = differenceInDays(bufferedMax, bufferedMin);

    const result = {
      minDate: bufferedMin,
      maxDate: bufferedMax,
      totalDays: Math.min(Math.max(days, 14), 90), // Minimum 14 days, maximum 90 days
    };

    return result;
  }, [tasks]);

  // Generate date labels for header
  const dateLabels = useMemo(() => {

    const labels: Date[] = [];
    for (let i = 0; i <= totalDays; i++) {
      labels.push(addDays(minDate, i));
    }

    return labels;
  }, [minDate, totalDays]);

  // Calculate task bar position and width
  const getTaskBarStyle = (task: Task) => {
    if (!task.dueDate) return null;

    const taskDate = startOfDay(new Date(task.dueDate));
    const daysFromStart = differenceInDays(taskDate, minDate);
    
    // Task duration: if recurring, show as 1-3 days, otherwise 1 day
    const duration = task.repeatInterval ? Math.min(task.repeatInterval, 3) : 1;
    
    const leftPercent = (daysFromStart / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
    };
  };

  const tasksWithDates = tasks.filter(t => t.dueDate);
  const tasksWithoutDates = tasks.filter(t => !t.dueDate);

  return (
    <div className="space-y-6">
      {/* Gantt Chart */}
      {tasksWithDates.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Date Header */}
            <div className="flex border-b mb-4 pb-2">
              <div className="w-48 flex-shrink-0 font-semibold text-sm">Aufgabe</div>
              <div className="flex-1 flex">
                {dateLabels.map((date, i) => {
                  // Show every 3rd date label to avoid crowding
                  if (i % 3 !== 0 && i !== dateLabels.length - 1) {
                    return <div key={i} className="flex-1" />;
                  }
                  return (
                    <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                      {format(date, "dd.MM")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Rows */}
            <div className="space-y-3">
              {tasksWithDates.map((task) => {
                const barStyle = getTaskBarStyle(task);
                
                return (
                  <div key={task.id} className="flex items-center group">
                    {/* Task Name */}
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {task.name}
                        </span>
                        {task.isCompleted && (
                          <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getMemberNames(task.assignedTo)}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative h-10 bg-muted/30 rounded">
                      {/* Today Marker */}
                      {(() => {
                        const today = startOfDay(new Date());
                        const daysFromStart = differenceInDays(today, minDate);
                        if (daysFromStart >= 0 && daysFromStart <= totalDays) {
                          const todayPercent = (daysFromStart / totalDays) * 100;
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                              style={{ left: `${todayPercent}%` }}
                            />
                          );
                        }
                        return null;
                      })()}

                      {/* Task Bar */}
                      {barStyle && (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center px-2 text-xs font-medium transition-all group-hover:h-7 ${
                            task.isCompleted
                              ? "bg-green-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}
                          style={barStyle}
                        >
                          <span className="truncate">{task.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tasks without dates */}
      {tasksWithoutDates.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            Aufgaben ohne Fälligkeitsdatum
          </h3>
          <div className="space-y-2">
            {tasksWithoutDates.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {task.name}
                    </span>
                    {task.isCompleted && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Erledigt
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{getMemberNames(task.assignedTo)}</span>
                    {task.repeatInterval && task.repeatUnit && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Wiederkehrend
                      </Badge>
                    )}
                    {task.enableRotation && (
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        Rotation
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>Offen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>Erledigt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>Heute</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, List, FolderKanban, Target, CheckCircle2, Clock, ArrowRight, Check, Bell, Trash2, Filter, ArrowUpDown, X } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast } from "date-fns";
import { de } from "date-fns/locale";
import TaskDependencies from "@/components/TaskDependencies";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { toast } from "sonner";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [actionTask, setActionTask] = useState<any | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Filter and sort state for tasks without dates
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Chronological list time range filter (in months from today)
  const [chronologicalRange, setChronologicalRange] = useState<number>(3);

  const utils = trpc.useUtils();

  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Load all dependencies once for all tasks
  const { data: dependencies = [] } = trpc.projects.getAllDependencies.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: projects = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Get activity history for completed recurring tasks
  const { data: activityHistory = [] } = trpc.activities.list.useQuery(
    { householdId: household?.householdId ?? 0, limit: 200 },
    { enabled: !!household }
  );

  // Mutations
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Aufgabe gelöscht");
    },
  });

  const completeTaskMutation = trpc.tasks.toggleComplete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setCompleteDialogOpen(false);
      setActionTask(null);
      toast.success("Aufgabe abgeschlossen!");
    },
  });

  const milestoneMutation = trpc.tasks.addMilestone.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setMilestoneDialogOpen(false);
      setActionTask(null);
      toast.success("Zwischenziel vermerkt!");
    },
  });

  const reminderMutation = trpc.tasks.sendReminder.useMutation({
    onSuccess: () => {
      setReminderDialogOpen(false);
      setActionTask(null);
      toast.success("Erinnerung gesendet!");
    },
  });

  const undoCompletionMutation = trpc.tasks.undoRecurringCompletion.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activities.list.invalidate();
      toast.success("Abschluss rückgängig gemacht!");
    },
  });

  const skipOccurrenceMutation = trpc.tasks.skipOccurrence.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Termin ausgelassen!");
    },
  });

  // Auth check removed - AppLayout handles this

  // Get current month days for calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate future occurrences for recurring tasks
  const calculateFutureOccurrences = (task: typeof tasks[0], maxMonths: number = 12) => {
    if (!task.dueDate || !task.repeatInterval || !task.repeatUnit) {
      return [];
    }

    const occurrences: Array<{ date: Date; isOriginal: boolean }> = [];
    let currentDate = new Date(task.dueDate);
    const skippedDates = task.skippedDates || [];
    
    // Calculate max date (12 months from current month view)
    const maxDate = new Date(monthEnd);
    maxDate.setMonth(maxDate.getMonth() + maxMonths);
    
    let iterations = 0;
    const maxIterations = 365; // Safety limit

    while (currentDate <= maxDate && iterations < maxIterations) {
      // Calculate next occurrence
      const nextDate = new Date(currentDate);
      if (task.repeatUnit === "days") {
        nextDate.setDate(nextDate.getDate() + task.repeatInterval);
      } else if (task.repeatUnit === "weeks") {
        nextDate.setDate(nextDate.getDate() + (task.repeatInterval * 7));
      } else if (task.repeatUnit === "months") {
        nextDate.setMonth(nextDate.getMonth() + task.repeatInterval);
      }

      // Check if this date is skipped
      const dateKey = format(nextDate, "yyyy-MM-dd");
      const isSkipped = skippedDates.includes(dateKey);

      // Only include if within current month view AND not skipped
      if (nextDate >= monthStart && nextDate <= monthEnd && !isSkipped) {
        occurrences.push({ date: nextDate, isOriginal: false });
      }

      currentDate = nextDate;
      iterations++;
    }

    return occurrences;
  };

  // Group tasks by date (including future occurrences and completed history)
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Array<typeof tasks[0] & { isFutureOccurrence?: boolean; isCompletedOccurrence?: boolean; activityId?: number }>> = {};
    
    tasks.forEach(task => {
      // Add current task
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }

      // Add future occurrences for recurring tasks
      if (task.repeatInterval && task.repeatUnit) {
        const futureOccurrences = calculateFutureOccurrences(task);
        futureOccurrences.forEach(occurrence => {
          const dateKey = format(occurrence.date, "yyyy-MM-dd");
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push({ ...task, isFutureOccurrence: true, occurrenceDate: occurrence.date } as any);
        });
      }
    });

    // Add completed occurrences from activity history
    const activities = Array.isArray(activityHistory) ? activityHistory : activityHistory?.activities || [];
    activities.forEach((activity: any) => {
      if (activity.action === "completed" && activity.relatedItemId && activity.completedDate) {
        const task = tasks.find(t => t.id === activity.relatedItemId);
        if (task && task.repeatInterval && task.repeatUnit) {
          const completedDate = new Date(activity.completedDate);
          // Only show if within current month view
          if (completedDate >= monthStart && completedDate <= monthEnd) {
            const dateKey = format(completedDate, "yyyy-MM-dd");
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push({ 
              ...task, 
              isCompletedOccurrence: true, 
              activityId: activity.id,
              dueDate: completedDate 
            });
          }
        }
      }
    });
    
    return grouped;
  }, [tasks, activityHistory, monthStart, monthEnd]);
  // Create chronological task list with future occurrences
  const chronologicalTasks = useMemo(() => {
    const allTasks: Array<typeof tasks[0] & { isFutureOccurrence?: boolean; isCompletedOccurrence?: boolean; activityId?: number; isOverdue?: boolean }> = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + chronologicalRange);
    
    // Add current tasks
    tasks.forEach(task => {
      if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        
        // Include if within range OR overdue (and not completed)
        if ((taskDate <= endDate) || (taskDate < today && !task.isCompleted)) {
          allTasks.push({
            ...task,
            isOverdue: taskDate < today && !task.isCompleted
          });
        }
      }
      
      // Add future occurrences for recurring tasks
      if (task.repeatInterval && task.repeatUnit) {
        const futureOccurrences = calculateFutureOccurrences(task, chronologicalRange);
        futureOccurrences.forEach(occurrence => {
          const occurrenceDate = new Date(occurrence.date);
          occurrenceDate.setHours(0, 0, 0, 0);
          
          if (occurrenceDate <= endDate) {
            allTasks.push({ 
              ...task, 
              dueDate: occurrence.date, 
              isFutureOccurrence: true,
              occurrenceDate: occurrence.date,
              isOverdue: false
            } as any);
          }
        });
      }
    });
    
    // Sort: overdue first, then by due date (oldest first)
    return allTasks.sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      
      // Overdue tasks come first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, chronologicalRange]);

  // Tasks without due dates - filtered and sorted
  const tasksWithoutDates = useMemo(() => {
    let filtered = tasks.filter(task => !task.dueDate);
    
    // Apply assignee filter
    if (filterAssignee !== null) {
      filtered = filtered.filter(task => task.assignedTo === filterAssignee);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "createdAt") {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = aDate - bDate;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [tasks, filterAssignee, sortBy, sortOrder]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Get tasks for selected date
  const selectedDateTasks = selectedDate
    ? tasksByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const getMemberName = (memberId: number | null) => {
    if (!memberId) return "Nicht zugewiesen";
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || "Unbekannt";
  };

  const getProjectName = (projectIds: number[] | null) => {
    if (!projectIds || projectIds.length === 0) return null;
    // Return first project name if multiple projects
    const project = projects.find(p => p.id === projectIds[0]);
    return project?.name;
  };

  const getFrequencyBadge = (task: typeof tasks[0]) => {
    if (!task.repeatInterval || !task.repeatUnit) return null;
    
    const interval = task.repeatInterval;
    const unit = task.repeatUnit;
    
    if (interval === 1) {
      if (unit === "days") return "Täglich";
      if (unit === "weeks") return "Wöchentlich";
      if (unit === "months") return "Monatlich";
    }
    
    const unitText = unit === "days" ? "Tag" : unit === "weeks" ? "Woche" : "Monat";
    return `Alle ${interval} ${unitText}${interval > 1 ? "e" : ""}`;
  };

  const handleDelete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!household || !member) return;
    if (confirm("Möchten Sie diese Aufgabe wirklich löschen?")) {
      deleteMutation.mutate({
        taskId: task.id,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const handleCompleteTask = async (data: { comment?: string; photoUrls: string[] }) => {
    if (!actionTask || !household || !member) return;
    // First toggle complete
    await completeTaskMutation.mutateAsync({
      taskId: actionTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      isCompleted: true,
    });
    // Then add milestone if there's a comment or photo
    if (data.comment || data.photoUrls.length > 0) {
      await milestoneMutation.mutateAsync({
        taskId: actionTask.id,
        householdId: household.householdId,
        memberId: member.memberId,
        comment: data.comment,
        photoUrls: data.photoUrls,
      });
    }
  };

  const handleAddMilestone = async (data: { comment?: string; photoUrls: string[] }) => {
    if (!actionTask || !household || !member) return;
    await milestoneMutation.mutateAsync({
      taskId: actionTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const handleSendReminder = async (data: { comment?: string }) => {
    if (!actionTask || !household || !member) return;
    await reminderMutation.mutateAsync({
      taskId: actionTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
    });
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Terminübersicht</h1>
            {household && <p className="text-muted-foreground">{household.householdName}</p>}
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Kalenderansicht
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Alle Aufgaben
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(currentMonth, "MMMM yyyy", { locale: de })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousMonth}
                    >
                      ← Zurück
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                    >
                      Heute
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextMonth}
                    >
                      Weiter →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before month start */}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                  
                  {/* Month days */}
                  {monthDays.map(day => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayTasks = tasksByDate[dateKey] || [];
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const hasTasks = dayTasks.length > 0;
                    
                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          p-2 rounded-lg border transition-all min-h-[60px] flex flex-col items-center justify-start
                          ${isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50"}
                          ${isCurrentDay && !isSelected ? "border-primary border-2" : ""}
                        `}
                      >
                        <span className={`text-sm font-medium ${isCurrentDay && !isSelected ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </span>
                        {hasTasks && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {dayTasks.slice(0, 3).map((task, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  task.isCompletedOccurrence
                                    ? "bg-green-500"
                                    : task.isFutureOccurrence
                                    ? "bg-purple-400 opacity-60"
                                    : task.isCompleted
                                    ? "bg-green-500"
                                    : isPast(new Date(task.dueDate!))
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                                }`}
                                title={
                                  task.isCompletedOccurrence
                                    ? "Erledigter Termin"
                                    : task.isFutureOccurrence
                                    ? "Folgetermin"
                                    : ""
                                }
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[10px] ml-0.5">+{dayTasks.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Date Tasks */}
                {selectedDate && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Aufgaben am {format(selectedDate, "d. MMMM yyyy", { locale: de })}
                    </h3>
                    {selectedDateTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Keine Aufgaben an diesem Tag
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDateTasks.map(task => {
                          const projectName = getProjectName(task.projectIds);
                          const frequency = getFrequencyBadge(task);
                          
                          return (
                            <Card 
                              key={task.id} 
                              className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${task.isCompleted ? "opacity-60" : ""}`}
                              onClick={() => {
                                setSelectedTask(task);
                                setTaskDialogOpen(true);
                              }}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>
                                        {task.name}
                                      </span>
                                      {task.isCompleted && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Erledigt
                                        </Badge>
                                      )}
                                      {task.isCompletedOccurrence && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Erledigter Termin
                                        </Badge>
                                      )}
                                      {task.isFutureOccurrence && (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                          Folgetermin
                                        </Badge>
                                      )}
                                      {!task.isCompleted && task.dueDate && isPast(new Date(task.dueDate)) && (
                                        <Badge variant="destructive" className="text-xs">
                                          Überfällig
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                      <span>{getMemberName(task.assignedTo)}</span>
                                      {task.dueDate && (
                                        <span>• {format(new Date(task.dueDate), "HH:mm")} Uhr</span>
                                      )}
                                      {projectName && (
                                        <Badge variant="outline" className="text-xs">
                                          <FolderKanban className="h-3 w-3 mr-1" />
                                          {projectName}
                                        </Badge>
                                      )}
                                      <TaskDependencies
                                        taskId={task.id}
                                        allTasks={tasks}
                                        compact
                                      />
                                      {frequency && (
                                        <Badge variant="outline" className="text-xs">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {frequency}
                                        </Badge>
                                      )}
                                      {task.enableRotation && (
                                        <Badge variant="outline" className="text-xs">
                                          <Target className="h-3 w-3 mr-1" />
                                          Rotation
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                      {task.isCompletedOccurrence && task.activityId && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full col-span-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Möchten Sie den Abschluss dieses Termins rückgängig machen? Die Aufgabe wird auf dieses Datum zurückgesetzt.")) {
                                              undoCompletionMutation.mutate({
                                                taskId: task.id,
                                                householdId: household?.householdId ?? 0,
                                                memberId: member?.memberId ?? 0,
                                                activityId: task.activityId!,
                                              });
                                            }
                                          }}
                                        >
                                          <ArrowLeft className="h-4 w-4 mr-1" />
                                          Rückgängig machen
                                        </Button>
                                      )}
                                      {task.isFutureOccurrence && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCurrentMonth(new Date(task.dueDate!));
                                              toast.info("Zum Termin gesprungen");
                                            }}
                                          >
                                            <ArrowRight className="h-4 w-4 mr-1" />
                                            Zum Termin
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-orange-600 hover:bg-orange-50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm("Möchten Sie diesen Termin auslassen? Er wird nicht mehr im Kalender angezeigt.")) {
                                                const targetDate = (task as any).occurrenceDate || new Date(task.dueDate!);
                                                skipOccurrenceMutation.mutate({
                                                  taskId: task.id,
                                                  householdId: household?.householdId ?? 0,
                                                  memberId: member?.memberId ?? 0,
                                                  dateToSkip: format(targetDate, "yyyy-MM-dd"),
                                                });
                                              }
                                            }}
                                          >
                                            <X className="h-4 w-4 mr-1" />
                                            Auslassen
                                          </Button>
                                        </>
                                      )}
                                      {!task.isCompleted && !task.isCompletedOccurrence && !task.isFutureOccurrence && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActionTask(task);
                                              setCompleteDialogOpen(true);
                                            }}
                                          >
                                            <Check className="h-4 w-4 mr-1" />
                                            Abschließen
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActionTask(task);
                                              setMilestoneDialogOpen(true);
                                            }}
                                          >
                                            <Target className="h-4 w-4 mr-1" />
                                            Zwischenziel
                                          </Button>
                                        </>
                                      )}
                                      {!task.isFutureOccurrence && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionTask(task);
                                            setReminderDialogOpen(true);
                                          }}
                                        >
                                          <Bell className="h-4 w-4 mr-1" />
                                          Erinnern
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={(e) => handleDelete(task, e)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Löschen
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tasks View - Chronological */}
          <TabsContent value="all" className="space-y-4">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Alle Aufgaben (chronologisch)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Zeitraum:</label>
                    <select 
                      className="border rounded px-2 py-1 text-sm"
                      value={chronologicalRange}
                      onChange={(e) => setChronologicalRange(Number(e.target.value))}
                    >
                      <option value={1}>1 Monat</option>
                      <option value={3}>3 Monate</option>
                      <option value={6}>6 Monate</option>
                      <option value={12}>12 Monate</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chronologicalTasks.length === 0 ? (
                  <div className="py-16 text-center">
                    <List className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Keine Aufgaben vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chronologicalTasks.map((task, index) => {
                      const frequency = getFrequencyBadge(task);
                      const projectName = getProjectName(task.projectIds);
                      
                      return (
                        <Card 
                          key={`${task.id}-${index}`}
                          className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                            task.isCompletedOccurrence ? "opacity-60" :
                            (task as any).isOverdue ? "border-red-300 bg-red-50" :
                            task.isFutureOccurrence ? "border-purple-200" :
                            task.isCompleted ? "opacity-60" : ""
                          }`}
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${
                                    task.isCompleted || task.isCompletedOccurrence ? "line-through" : ""
                                  }`}>
                                    {task.name}
                                  </span>
                                  {(task as any).isOverdue && (
                                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs font-semibold">
                                      Überfällig
                                    </Badge>
                                  )}
                                  {task.isFutureOccurrence && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                      Folgetermin
                                    </Badge>
                                  )}
                                  {task.isCompletedOccurrence && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Erledigter Termin
                                    </Badge>
                                  )}
                                  {task.isCompleted && !task.isCompletedOccurrence && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Erledigt
                                    </Badge>
                                  )}
                                  {!task.isCompleted && !task.isFutureOccurrence && task.dueDate && isPast(new Date(task.dueDate)) && (
                                    <Badge variant="destructive" className="text-xs">
                                      Überfällig
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span>{getMemberName(task.assignedTo)}</span>
                                  {task.dueDate && (
                                    <span>• {format(new Date(task.dueDate), "dd.MM.yyyy, HH:mm")} Uhr</span>
                                  )}
                                  {projectName && (
                                    <Badge variant="outline" className="text-xs">
                                      <FolderKanban className="h-3 w-3 mr-1" />
                                      {projectName}
                                    </Badge>
                                  )}
                                  {frequency && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {frequency}
                                    </Badge>
                                  )}
                                  {task.enableRotation && (
                                    <Badge variant="outline" className="text-xs">
                                      <Target className="h-3 w-3 mr-1" />
                                      Rotation
                                    </Badge>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {task.isCompletedOccurrence && task.activityId && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full col-span-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Möchten Sie den Abschluss dieses Termins rückgängig machen? Die Aufgabe wird auf dieses Datum zurückgesetzt.")) {
                                            undoCompletionMutation.mutate({
                                              taskId: task.id,
                                              householdId: household?.householdId ?? 0,
                                              memberId: member?.memberId ?? 0,
                                              activityId: task.activityId!,
                                            });
                                          }
                                        }}
                                      >
                                        <ArrowLeft className="h-4 w-4 mr-1" />
                                        Rückgängig machen
                                      </Button>
                                    )}
                                    {task.isFutureOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const targetDate = (task as any).occurrenceDate || new Date(task.dueDate!);
                                            setCurrentMonth(targetDate);
                                            toast.info("Zum Termin gesprungen");
                                          }}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-1" />
                                          Zum Termin
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-orange-600 hover:bg-orange-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Möchten Sie diesen Termin auslassen? Er wird nicht mehr im Kalender angezeigt.")) {
                                              const targetDate = (task as any).occurrenceDate || new Date(task.dueDate!);
                                              skipOccurrenceMutation.mutate({
                                                taskId: task.id,
                                                householdId: household?.householdId ?? 0,
                                                memberId: member?.memberId ?? 0,
                                                dateToSkip: format(targetDate, "yyyy-MM-dd"),
                                              });
                                            }
                                          }}
                                        >
                                          <X className="h-4 w-4 mr-1" />
                                          Auslassen
                                        </Button>
                                      </>
                                    )}
                                    {!task.isCompleted && !task.isCompletedOccurrence && !task.isFutureOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionTask(task);
                                            setCompleteDialogOpen(true);
                                          }}
                                        >
                                          <Check className="h-4 w-4 mr-1" />
                                          Abschließen
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionTask(task);
                                            setMilestoneDialogOpen(true);
                                          }}
                                        >
                                          <Target className="h-4 w-4 mr-1" />
                                          Zwischenziel
                                        </Button>
                                      </>
                                    )}
                                    {!task.isCompletedOccurrence && !task.isFutureOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionTask(task);
                                            setReminderDialogOpen(true);
                                          }}
                                        >
                                          <Bell className="h-4 w-4 mr-1" />
                                          Erinnern
                                        </Button>
                                      </>
                                    )}
                                    {!task.isCompletedOccurrence && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={(e) => handleDelete(task, e)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Löschen
                                      </Button>
                                    )}
                                  </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks Without Due Dates */}
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Aufgaben ohne Termine ({tasksWithoutDates.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Assignee Filter */}
                    <Select
                      value={filterAssignee?.toString() ?? "all"}
                      onValueChange={(value) => setFilterAssignee(value === "all" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Alle Mitglieder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Mitglieder</SelectItem>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.memberName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort By */}
                    <Select
                      value={sortBy}
                      onValueChange={(value: "createdAt" | "name") => setSortBy(value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Erstellungsdatum</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Order */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tasksWithoutDates.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {filterAssignee !== null
                      ? "Keine Aufgaben ohne Termine für dieses Mitglied"
                      : "Keine Aufgaben ohne Termine"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasksWithoutDates.map(task => {
                      const frequency = getFrequencyBadge(task);
                      const projectName = getProjectName(task.projectIds);
                      
                      return (
                        <Card 
                          key={task.id}
                          className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                            task.isCompleted ? "opacity-60" : ""
                          }`}
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${
                                    task.isCompleted ? "line-through" : ""
                                  }`}>
                                    {task.name}
                                  </span>
                                  {task.isCompleted && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Erledigt
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span>{getMemberName(task.assignedTo)}</span>
                                  {task.createdAt && (
                                    <span>• Erstellt: {format(new Date(task.createdAt), "dd.MM.yyyy")}</span>
                                  )}
                                  {projectName && (
                                    <Badge variant="outline" className="text-xs">
                                      <FolderKanban className="h-3 w-3 mr-1" />
                                      {projectName}
                                    </Badge>
                                  )}
                                  {frequency && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {frequency}
                                    </Badge>
                                  )}
                                  {task.enableRotation && (
                                    <Badge variant="outline" className="text-xs">
                                      <Target className="h-3 w-3 mr-1" />
                                      Rotation
                                    </Badge>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                {!task.isCompleted && (
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionTask(task);
                                        setCompleteDialogOpen(true);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Abschließen
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionTask(task);
                                        setMilestoneDialogOpen(true);
                                      }}
                                    >
                                      <Target className="h-4 w-4 mr-1" />
                                      Zwischenziel
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionTask(task);
                                        setReminderDialogOpen(true);
                                      }}
                                    >
                                      <Bell className="h-4 w-4 mr-1" />
                                      Erinnern
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={(e) => handleDelete(task, e)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Löschen
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setSelectedTask(null);
        }}
        members={members.map(m => ({ memberId: m.id, memberName: m.memberName }))}
        onTaskUpdated={() => {
          // Refetch tasks after update
          window.location.reload(); // Simple approach for now
        }}
      />

      {/* Action Dialogs */}
      {actionTask && (
        <>
          <CompleteTaskDialog
            open={completeDialogOpen}
            onOpenChange={setCompleteDialogOpen}
            task={actionTask}
            onComplete={handleCompleteTask}
          />
          <MilestoneDialog
            open={milestoneDialogOpen}
            onOpenChange={setMilestoneDialogOpen}
            task={actionTask}
            onAddMilestone={handleAddMilestone}
          />
          <ReminderDialog
            open={reminderDialogOpen}
            onOpenChange={setReminderDialogOpen}
            task={actionTask}
            onSendReminder={handleSendReminder}
          />
        </>
      )}
    </AppLayout>
  );
}

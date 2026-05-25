import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, List, FolderKanban, Target, CheckCircle2, Clock, ArrowRight, Check, Bell, Trash2, Filter, ArrowUpDown, X, Users, Star } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast } from "date-fns";
import { TaskCalendar, type TaskOccurrence, type TaskCalendarHandle } from "@/components/TaskCalendar";
import { getDateFnsLocaleSync } from "@/lib/i18n";
import TaskDependencies from "@/components/TaskDependencies";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { EventDetailDialog } from "@/components/EventDetailDialog";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Calendar() {
  const { t, i18n } = useTranslation(["tasks", "common", "calendar"]);
  const dateFnsLocale = getDateFnsLocaleSync(i18n.language);

  // Generate weekday abbreviations automatically from date-fns locale
  // Sunday = day index 0, Saturday = day index 6
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const refDate = new Date(2023, 0, i + 1); // 2023-01-01 is a Sunday
    return format(refDate, "EEEEEE", { locale: dateFnsLocale });
  });
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [eventDetailDialogOpen, setEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [actionTask, setActionTask] = useState<any | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const taskCalendarRef = useRef<TaskCalendarHandle>(null);
  // Ref to close the popup after completing a task
  const pendingPopupCloseRef = useRef<(() => void) | null>(null);
  
  // Filter and sort state for tasks without dates
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Chronological list time range filter (in months from today)
  const [chronologicalRange, setChronologicalRange] = useState<number>(3);
  
  // Event type filter for calendar view
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "tasks" | "borrow_events">("all");

  // Skip-confirmation dialog state
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [skipConfirmData, setSkipConfirmData] = useState<{
    skippedCount: number;
    skippedOccurrenceDates: string[];
    nextDate: string | null;
    pendingCompleteData: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] } | null;
  } | null>(null);

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

  // Get calendar events (borrow events)
  const { data: calendarEvents = [] } = trpc.calendar.getEvents.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Mutations
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.shopping.list.invalidate();
      toast.success(t("tasks:messages.deleted"));
    },
  });

  const completeTaskMutation = trpc.tasks.completeTask.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activities.list.invalidate();
      setCompleteDialogOpen(false);
      setActionTask(null);
      toast.success(t("tasks:messages.completed"));
      // Close the popup after completing a task
      if (pendingPopupCloseRef.current) {
        pendingPopupCloseRef.current();
        pendingPopupCloseRef.current = null;
      }
    },
  });

  const milestoneMutation = trpc.tasks.addMilestone.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setMilestoneDialogOpen(false);
      setActionTask(null);
      toast.success(t("tasks:messages.milestoneRecorded", "Zwischenziel vermerkt!"));
    },
  });

  const reminderMutation = trpc.tasks.sendReminder.useMutation({
    onSuccess: () => {
      setReminderDialogOpen(false);
      setActionTask(null);
      toast.success(t("tasks:messages.reminderSent", "Erinnerung gesendet!"));
    },
  });

  const undoCompletionMutation = trpc.tasks.undoRecurringCompletion.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activities.list.invalidate();
      toast.success(t("tasks:messages.undone", "Abschluss rükgängig gemacht!"));;
    },
  });

  // State for occurrence note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTask, setNoteTask] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

  const addOccurrenceNoteMutation = trpc.tasks.addOccurrenceNote.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setNoteDialogOpen(false);
      setNoteTask(null);
      setNoteText("");
      toast.success(t("calendar:messages.noteAdded", "Notiz gespeichert!"));
    },
    onError: (error) => {
      toast.error(t("common:errors.generic", "Fehler: ") + error.message);
    },
  });

  const skipOccurrenceMutation = trpc.tasks.skipOccurrence.useMutation({
    onSuccess: async (_data, variables) => {
      // Invalidate and wait for fresh data so findNextOpenOccurrence uses updated occurrenceNotes
      await utils.tasks.list.invalidate();
      utils.tasks.getRotationSchedule.invalidate();
      // Update selectedTask in-place so TaskDetailDialog reflects the new skip status immediately
      setSelectedTask((prev: any) => {
        if (!prev || prev.id !== variables.taskId) return prev;
        return { ...prev };
      });
      // Close popup if it was triggered from popup
      if (pendingPopupCloseRef.current) {
        pendingPopupCloseRef.current();
        pendingPopupCloseRef.current = null;
      }
      // Jump to the next open occurrence using fresh task data
      const freshTasks = utils.tasks.list.getData({ householdId: household?.householdId ?? 0 }) as any[] | undefined;
      const freshTask = freshTasks?.find((t: any) => t.id === variables.taskId);
      if (freshTask) {
        const nextDate = findNextOpenOccurrence(freshTask);
        if (taskCalendarRef.current) {
          taskCalendarRef.current.jumpToOccurrence(nextDate, variables.taskId);
        } else {
          setCurrentMonth(nextDate);
          setSelectedDate(nextDate);
        }
      }
      toast.success(t("calendar:messages.occurrenceSkipped", "Termin ausgelassen!"));
    },
    onError: (error) => {
      toast.error(t("common:errors.generic", "Fehler: ") + error.message);
    },
  });

  const unskipOccurrenceMutation = trpc.tasks.restoreSkippedDate.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.tasks.list.invalidate();
      utils.tasks.getRotationSchedule.invalidate();
      toast.success(t("calendar:messages.occurrenceRestored", "Termin wiederhergestellt!"));
    },
    onError: (error) => {
      toast.error(t("common:errors.generic", "Fehler: ") + error.message);
    },
  });

  const markReturnedMutation = trpc.borrow.markReturned.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      setEventDetailDialogOpen(false);
      setSelectedEvent(null);
      toast.success(t("tasks:messages.markedReturned", "Als zurückgegeben markiert!"));
    },
    onError: (error) => {
      toast.error(t("common:errors.generic", "Fehler: ") + error.message);
    },
  });

  // Auth check removed - AppLayout handles this

  // Get current month days for calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Wide range for tasksByDate: ±12 months so TaskCalendar can navigate freely
  const wideMonthStart = useMemo(() => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() - 12);
    return d;
  }, [monthStart]);
  const wideMonthEnd = useMemo(() => {
    const d = new Date(monthEnd);
    d.setMonth(d.getMonth() + 12);
    return d;
  }, [monthEnd]);

  // Calculate future occurrences for recurring tasks
  const calculateFutureOccurrences = (task: typeof tasks[0], maxMonths: number = 12) => {
    if (!task.dueDate || !task.repeatInterval || !task.repeatUnit) {
      return [];
    }

    const occurrences: Array<{ date: Date; isOriginal: boolean; occurrenceNote?: string }> = [];
    let currentDate = new Date(task.dueDate);
    // occurrenceNotes is the single source of truth for skip status
    const occurrenceNotes: { occurrenceNumber: number; notes: string; isSkipped?: boolean }[] = (task as any).occurrenceNotes || [];
    
    // Calculate max date: use wideMonthEnd so future occurrences in other months are included
    const maxDate = new Date(wideMonthEnd);
    
    let iterations = 0;
    const maxIterations = 365; // Safety limit
    let occurrenceNumber = 1; // dueDate = occurrence 1

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

      occurrenceNumber++;

      // Check if this occurrence is skipped (occurrenceNotes is single source of truth)
      const noteEntry = occurrenceNotes.find(n => n.occurrenceNumber === occurrenceNumber);
      const isSkipped = noteEntry?.isSkipped === true;

      // Check if this occurrence has a note
      const hasNote = !!(noteEntry?.notes);

      // Include if: within wide range (±12 months) AND not skipped
      const inMonthView = nextDate >= wideMonthStart && nextDate <= wideMonthEnd;
      if (!isSkipped && inMonthView) {
        occurrences.push({ date: nextDate, isOriginal: false, occurrenceNote: noteEntry?.notes });
      }

      currentDate = nextDate;
      iterations++;
    }

    return occurrences;
  };

  // Find next open occurrence for a recurring task
  // Returns the chronologically EARLIEST non-skipped occurrence (including special occurrences)
  const findNextOpenOccurrence = (task: typeof tasks[0]) => {
    if (!task.repeatInterval || !task.repeatUnit || !task.dueDate) {
      return new Date(task.dueDate!);
    }

    // occurrenceNotes is the single source of truth for skip status
    const occurrenceNotes: any[] = (task as any).occurrenceNotes || [];

    // Check if any special occurrence (with specialDate) is the earliest non-skipped appointment
    const specialOccs = occurrenceNotes.filter(
      (n: any) => n.isSpecial && n.specialDate && !n.isSkipped
    );
    const earliestSpecial = specialOccs
      .map((n: any) => new Date(n.specialDate))
      .filter((d: Date) => !isNaN(d.getTime()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    // Find the earliest non-skipped regular occurrence
    const advanceDate = (d: Date): Date => {
      const next = new Date(d);
      if (task.repeatUnit === "days") {
        next.setDate(next.getDate() + task.repeatInterval!);
      } else if (task.repeatUnit === "weeks") {
        next.setDate(next.getDate() + task.repeatInterval! * 7);
      } else if (task.repeatUnit === "months") {
        next.setMonth(next.getMonth() + task.repeatInterval!);
      }
      return next;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 24);
    let cur = new Date(task.dueDate);
    cur.setHours(0, 0, 0, 0);
    const maxIterations = 5000;
    let i = 0;
    let occNum = 1;
    let earliestRegular: Date | null = null;
    while (cur <= maxDate && i < maxIterations) {
      const noteEntry = occurrenceNotes.find((n: any) => n.occurrenceNumber === occNum);
      const isSkipped = noteEntry?.isSkipped === true;
      if (!isSkipped) {
        earliestRegular = new Date(cur);
        break;
      }
      cur = advanceDate(cur);
      occNum++;
      i++;
    }

    // Return the chronologically earliest between special and regular
    if (earliestSpecial && earliestRegular) {
      return earliestSpecial.getTime() <= earliestRegular.getTime() ? earliestSpecial : earliestRegular;
    }
    return earliestSpecial || earliestRegular || new Date(task.dueDate);
  };

  // Group tasks and events by date (including future occurrences and completed history)
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Array<(typeof tasks[0] & { isFutureOccurrence?: boolean; isCompletedOccurrence?: boolean; activityId?: number }) | (typeof calendarEvents[0] & { isCalendarEvent: true })>> = {};
    
    tasks.forEach(task => {
      // Add current task (Occurrence 1 = dueDate)
      // Special case: if occurrence 1 is a special occurrence (isSpecial=true, specialDate set),
      // use specialDate as the display date instead of task.dueDate
      if (task.dueDate) {
        const occurrenceNotesList: any[] = (task as any).occurrenceNotes || [];
        // task.dueDate is ALWAYS the current (non-skipped) appointment.
        // After skipOccurrence, the server advances task.dueDate past the skipped date.
        // So we never need to check if occ1 is skipped here.
        //
        // Find the occurrenceNote whose date matches task.dueDate:
        // For special occurrences: occ.specialDate === task.dueDate
        // For regular occurrences: occurrenceNumber === 1 AND not skipped
        const taskDueDateStr = format(new Date(task.dueDate), "yyyy-MM-dd");
        // Check if there's a special occurrence whose specialDate matches task.dueDate
        const matchingSpecialNote = occurrenceNotesList.find((n: any) =>
          n.isSpecial && n.specialDate && format(new Date(n.specialDate), "yyyy-MM-dd") === taskDueDateStr
        );
        const occ1Note = matchingSpecialNote || occurrenceNotesList.find((n: any) => n.occurrenceNumber === 1 && !n.isSkipped);
        const occ1IsSpecial = !!matchingSpecialNote;
        const displayDate = new Date(task.dueDate);
        const taskDueDateKey = taskDueDateStr;
        if (!grouped[taskDueDateKey]) grouped[taskDueDateKey] = [];
        const currentNote = occ1Note?.notes || null;
        grouped[taskDueDateKey].push({
          ...task,
          dueDate: displayDate,
          occurrenceNote: currentNote,
          isSpecialOccurrence: occ1IsSpecial,
          specialOccurrenceName: occ1IsSpecial ? occ1Note?.specialName : undefined,
          isSkippedOccurrence: false, // task.dueDate is never skipped (server ensures this)
        } as any);
      }

      // Add future occurrences for recurring tasks (regular intervals)
      if (task.repeatInterval && task.repeatUnit && task.repeatUnit !== 'irregular') {
        const taskOccNotes: any[] = (task as any).occurrenceNotes || [];
        const hasRotationPlan = task.enableRotation && taskOccNotes.length > 0;

        if (hasRotationPlan) {
          // For rotation-plan tasks: only show occurrences that exist in occurrenceNotes
          const interval = task.repeatInterval;
          const unit = task.repeatUnit;
          taskOccNotes.forEach((noteEntry: any) => {
            const occNum = noteEntry.occurrenceNumber;
            if (occNum <= 1) return; // Occurrence 1 = dueDate, already added
            // Special occurrences have their own date (specialDate) and are handled separately below
            if (noteEntry.isSpecial && noteEntry.specialDate) return;
            const calcDate = new Date(task.dueDate!);
            const steps = occNum - 1;
            if (unit === 'days') calcDate.setDate(calcDate.getDate() + interval * steps);
            else if (unit === 'weeks') calcDate.setDate(calcDate.getDate() + interval * 7 * steps);
            else if (unit === 'months') calcDate.setMonth(calcDate.getMonth() + interval * steps);
            const isInMonth = calcDate >= wideMonthStart && calcDate <= wideMonthEnd;
            if (!isInMonth) return;
            const dateKey = format(calcDate, "yyyy-MM-dd");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            // Show skipped occurrences with isSkippedOccurrence flag (different color in calendar)
            grouped[dateKey].push({ ...task, isFutureOccurrence: !noteEntry.isSkipped, isSkippedOccurrence: !!noteEntry.isSkipped, occurrenceDate: calcDate, occurrenceNote: noteEntry.notes || null } as any);
          });
        } else {
          const futureOccurrences = calculateFutureOccurrences(task);
          futureOccurrences.forEach(occurrence => {
            const dateKey = format(occurrence.date, "yyyy-MM-dd");
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push({ ...task, isFutureOccurrence: true, occurrenceDate: occurrence.date, occurrenceNote: occurrence.occurrenceNote } as any);
          });
        }
      }

      // Add irregular occurrences and special occurrences from rotation schedule
      const occurrenceNotes: any[] = (task as any).occurrenceNotes || [];
      occurrenceNotes.forEach((occ: any) => {
        if (!occ.specialDate) return; // only entries with a date
        // Occurrence 1 is always handled as the main entry above (whether special or not)
        if (occ.occurrenceNumber === 1) return;
        const occDate = new Date(occ.specialDate);
        if (isNaN(occDate.getTime())) return;
        const isInMonth = occDate >= wideMonthStart && occDate <= wideMonthEnd;
        if (!isInMonth) return; // only show in wide range
        // Show skipped special occurrences with isSkippedOccurrence flag
        const dateKey = format(occDate, "yyyy-MM-dd");
        if (!grouped[dateKey]) grouped[dateKey] = [];
        // Determine if this special occurrence is the CURRENT appointment:
        // A special occurrence is the current appointment if its specialDate is <= task.dueDate
        // (i.e., it's due before or on the same day as the next regular appointment)
        const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isCurrentAppointment = taskDueDate && occDate.getTime() <= taskDueDate.getTime();
        grouped[dateKey].push({
          ...task,
          dueDate: occDate,
          isFutureOccurrence: !isCurrentAppointment && !occ.isSkipped,
          isSkippedOccurrence: !!occ.isSkipped,
          isSpecialOccurrence: occ.isSpecial || false,
          specialOccurrenceName: occ.specialName,
          occurrenceDate: occDate,
          occurrenceNumber: occ.occurrenceNumber,
          occurrenceNote: occ.notes,
        } as any);
      });
    });

    // Add completed occurrences from activity history (recurring tasks)
    const activities = Array.isArray(activityHistory) ? activityHistory : activityHistory?.activities || [];
    activities.forEach((activity: any) => {
      if (activity.action === "completed" && activity.relatedItemId) {
        const task = tasks.find(t => t.id === activity.relatedItemId);
        if (task) {
          // completedDate is stored in metadata.originalDueDate (for recurring tasks)
          // or falls back to createdAt (the timestamp when the action was logged)
          const meta = (activity as any).metadata;
          const rawDate = meta?.originalDueDate || activity.createdAt;
          if (!rawDate) return;
          const completedDate = new Date(rawDate);
          if (completedDate >= wideMonthStart && completedDate <= wideMonthEnd) {
            const dateKey = format(completedDate, "yyyy-MM-dd");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            // Avoid duplicate: remove any open entry for the same task on the same date
            grouped[dateKey] = grouped[dateKey].filter(
              (e: any) => !(e.id === task.id && !e.isCompletedOccurrence && !e.isFutureOccurrence)
            );
            // Only add if not already present as completed
            const alreadyAdded = grouped[dateKey].some(
              (e: any) => e.id === task.id && e.isCompletedOccurrence && e.activityId === activity.id
            );
            if (!alreadyAdded) {
              grouped[dateKey].push({
                ...task,
                isCompletedOccurrence: true,
                activityId: activity.id,
                dueDate: completedDate,
              });
            }
          }
        }
      }
    });

    // Show skipped occurrences from activityHistory (past skipped dates)
    activities.forEach((activity: any) => {
      if (activity.action === "skipped" && activity.relatedItemId) {
        const task = tasks.find(t => t.id === activity.relatedItemId);
        if (task) {
          const meta = (activity as any).metadata;
          const rawDate = meta?.skippedDate || activity.createdAt;
          if (!rawDate) return;
          const skippedDate = new Date(rawDate);
          if (skippedDate >= wideMonthStart && skippedDate <= wideMonthEnd) {
            const dateKey = format(skippedDate, "yyyy-MM-dd");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            // Only add if not already present as skipped for this activity
            const alreadyAdded = grouped[dateKey].some(
              (e: any) => e.id === task.id && (e as any).isSkippedOccurrence && (e as any).activityId === activity.id
            );
            if (!alreadyAdded) {
              // Remove any open (non-completed, non-skipped) entry for this task on this date
              grouped[dateKey] = grouped[dateKey].filter(
                (e: any) => !(e.id === task.id && !e.isCompletedOccurrence && !(e as any).isSkippedOccurrence && !e.isFutureOccurrence)
              );
              grouped[dateKey].push({
                ...task,
                isSkippedOccurrence: true,
                activityId: activity.id,
                dueDate: skippedDate,
              } as any);
            }
          }
        }
      }
    });

    // Also show completed single (non-recurring) tasks at their dueDate
    tasks.forEach(task => {
      if (task.isCompleted && task.dueDate && !task.repeatInterval) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        // Only add if not already covered by activityHistory above
        const alreadyCovered = grouped[dateKey]?.some(
          (e: any) => e.id === task.id && e.isCompletedOccurrence
        );
        if (!alreadyCovered) {
          if (!grouped[dateKey]) grouped[dateKey] = [];
          // Replace any open entry for this task with the completed version
          grouped[dateKey] = grouped[dateKey].filter((e: any) => e.id !== task.id);
          grouped[dateKey].push({ ...task });
        }
      }
    });

    // Add calendar events (borrow events)
    calendarEvents.forEach((event: any) => {
      if (event.startDate) {
        const dateKey = format(new Date(event.startDate), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({ ...event, isCalendarEvent: true } as any);
      }
    });
    
    return grouped;
  }, [tasks, activityHistory, calendarEvents, wideMonthStart, wideMonthEnd]);

  // Convert tasksByDate to TaskOccurrence[] for TaskCalendar
  const taskOccurrences = useMemo((): TaskOccurrence[] => {
    const result: TaskOccurrence[] = [];
    Object.entries(tasksByDate).forEach(([, items]) => {
      (items as any[]).forEach((item, idx) => {
        const date = item.occurrenceDate
          ? new Date(item.occurrenceDate)
          : item.dueDate
          ? new Date(item.dueDate)
          : item.startDate
          ? new Date(item.startDate)
          : null;
        if (!date) return;
        result.push({
          key: `${item.isCalendarEvent ? 'event' : 'task'}-${item.id}-${idx}`,
          taskId: item.id,
          taskName: item.isCalendarEvent ? item.title : item.name,
          date,
          isCompleted: !!item.isCompleted,
          isSkipped: !!item.isSkippedOccurrence,
          isSpecial: !!item.isSpecialOccurrence,
          specialName: item.specialOccurrenceName,
          isFutureOccurrence: !!item.isFutureOccurrence,
          isCompletedOccurrence: !!item.isCompletedOccurrence,
          isCalendarEvent: !!item.isCalendarEvent,
          eventType: item.eventType,
          repeatUnit: item.repeatUnit,
          occurrenceNote: item.occurrenceNote,
          raw: item,
        });
      });
    });
    return result;
  }, [tasksByDate]);

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
        const occNotesList: any[] = (task as any).occurrenceNotes || [];
        const occ1Note = occNotesList.find((n: any) => n.occurrenceNumber === 1);
        const isOcc1Skipped = occ1Note?.isSkipped === true;
        // If occurrence 1 is a special occurrence, use its specialDate as the display date
        const occ1IsSpecial = occ1Note?.isSpecial === true && occ1Note?.specialDate;
        const displayDate = occ1IsSpecial ? new Date(occ1Note.specialDate) : new Date(task.dueDate);
        const taskDate = new Date(displayDate);
        taskDate.setHours(0, 0, 0, 0);
        
        // Include if: within range AND not skipped
        // Exclude: completed single-occurrence tasks (isCompleted=true, no repeatInterval)
        // Exclude: completed recurring tasks (isCompleted=true with repeatInterval) – they are shown as completedOccurrence via activity history
        const isSingleTask = !task.repeatInterval || !task.repeatUnit;
        if (!isOcc1Skipped && taskDate <= endDate && !(task.isCompleted && isSingleTask)) {
          // Attach note for occurrence number 1 (current appointment)
          const currentNote = occ1Note?.notes || null;
          allTasks.push({
            ...task,
            dueDate: displayDate,
            occurrenceNote: currentNote,
            isSpecialOccurrence: !!occ1IsSpecial,
            specialOccurrenceName: occ1IsSpecial ? occ1Note.specialName : undefined,
            isOverdue: taskDate < today && !task.isCompleted
          } as any);
        }
      }
      
      // Add future occurrences for recurring tasks (regular intervals)
      if (task.repeatInterval && task.repeatUnit && task.repeatUnit !== 'irregular') {
        const taskOccurrenceNotes: any[] = (task as any).occurrenceNotes || [];
        const hasRotationPlan = task.enableRotation && taskOccurrenceNotes.length > 0;

        if (hasRotationPlan) {
          // For tasks with a rotation plan: only show occurrences that exist in occurrenceNotes
          // (occurrenceNotes is the authoritative list after deletions/renumbering)
          // Calculate the date for each known occurrence number from dueDate
          const interval = task.repeatInterval;
          const unit = task.repeatUnit;
          taskOccurrenceNotes.forEach((noteEntry: any) => {
            const occNum = noteEntry.occurrenceNumber;
            if (occNum <= 1) return; // Occurrence 1 = dueDate, already added above
            if (noteEntry.isSkipped) return;
            // Special occurrences have their own date (specialDate) and are handled separately below
            if (noteEntry.isSpecial && noteEntry.specialDate) return;
            // Calculate date: dueDate + (occNum - 1) * interval
            const calcDate = new Date(task.dueDate!);
            const steps = occNum - 1;
            if (unit === 'days') calcDate.setDate(calcDate.getDate() + interval * steps);
            else if (unit === 'weeks') calcDate.setDate(calcDate.getDate() + interval * 7 * steps);
            else if (unit === 'months') calcDate.setMonth(calcDate.getMonth() + interval * steps);
            const calcDateNorm = new Date(calcDate);
            calcDateNorm.setHours(0, 0, 0, 0);
            if (calcDateNorm > endDate && !noteEntry.notes) return;
            allTasks.push({
              ...task,
              dueDate: calcDate,
              isFutureOccurrence: true,
              occurrenceDate: calcDate,
              occurrenceNote: noteEntry.notes || null,
              isOverdue: false,
            } as any);
          });
        } else {
          // For tasks without a rotation plan: calculate occurrences sequentially
          const futureOccurrences = calculateFutureOccurrences(task, chronologicalRange);
          futureOccurrences.forEach(occurrence => {
            const occurrenceDate = new Date(occurrence.date);
            occurrenceDate.setHours(0, 0, 0, 0);
            // Always include if within range, OR if it has a note (even if in the future beyond range)
            if (occurrenceDate <= endDate || occurrence.occurrenceNote) {
              allTasks.push({
                ...task,
                dueDate: occurrence.date,
                isFutureOccurrence: true,
                occurrenceDate: occurrence.date,
                occurrenceNote: occurrence.occurrenceNote,
                isOverdue: false
              } as any);
            }
          });
        }
      }

      // Add irregular occurrences and special occurrences from rotation schedule
      const occurrenceNotesForChron: any[] = (task as any).occurrenceNotes || [];
      occurrenceNotesForChron.forEach((occ: any) => {
        if (!occ.specialDate) return;
        // Occurrence 1 is always handled as the main entry above (whether special or not)
        if (occ.occurrenceNumber === 1) return;
        const occDate = new Date(occ.specialDate);
        if (isNaN(occDate.getTime())) return;
        const occDateNorm = new Date(occDate);
        occDateNorm.setHours(0, 0, 0, 0);
        if (occ.isSkipped) return;
        if (occDateNorm > endDate && !occ.notes) return; // skip if beyond range and no note
        // Determine if this special occurrence is the CURRENT appointment:
        // A special occurrence is the current appointment if its specialDate is <= task.dueDate
        const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isCurrentAppointment = taskDueDate && occDate.getTime() <= taskDueDate.getTime();
        allTasks.push({
          ...task,
          dueDate: occDate,
          isFutureOccurrence: !isCurrentAppointment,
          isSpecialOccurrence: occ.isSpecial || false,
          specialOccurrenceName: occ.specialName,
          occurrenceDate: occDate,
          occurrenceNumber: occ.occurrenceNumber,
          occurrenceNote: occ.notes,
          isOverdue: occDateNorm < today && !task.isCompleted,
        } as any);
      });
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
      filtered = filtered.filter(task => {
        const ids = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
        return ids.includes(filterAssignee);
      });
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
    if (!memberId) return t("common:labels.unassigned", "Nicht zugewiesen");
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || t("common:labels.unknown", "Unbekannt");
  };
  
  const getMemberNames = (memberIds: number[] | number | string | null | undefined) => {
    if (memberIds === null || memberIds === undefined) return t("common:labels.unassigned", "Nicht zugewiesen");
    // Handle single number (legacy data)
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
    if (ids.length === 0) return t("common:labels.unassigned", "Nicht zugewiesen");
    return ids.map(id => {
      const memberData = members.find((m) => m.id === id);
      return memberData?.memberName || t("common:labels.unknown", "Unbekannt");
    }).join(", ");
  };

  const getProjectName = (projectIds: number[] | null) => {
    if (!projectIds || projectIds.length === 0) return null;
    // Return first project name if multiple projects
    const project = projects.find(p => p.id === projectIds[0]);
    return project?.name;
  };

  const getFrequencyBadge = (task: typeof tasks[0]) => {
    if (!task.repeatInterval || !task.repeatUnit) return null;
    if (task.repeatUnit === 'irregular') return null;
    
    const interval = task.repeatInterval;
    const unit = task.repeatUnit;
    
    if (interval === 1) {
      if (unit === "days") return t("tasks:repeat.daily", "Täglich");
      if (unit === "weeks") return t("tasks:repeat.weekly", "Wöchentlich");
      if (unit === "months") return t("tasks:repeat.monthly", "Monatlich");
    }
    
    const unitText = unit === "days" ? t("tasks:repeat.day", "Tag") : unit === "weeks" ? t("tasks:repeat.week", "Woche") : t("tasks:repeat.month", "Monat");
    return t("tasks:repeat.every", { interval, unit: unitText, defaultValue: `Alle ${interval} ${unitText}${interval > 1 ? "e" : ""}` });
  };

  const handleDelete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!household || !member) return;
    if (confirm(t("tasks:messages.confirmDelete", "Möchten Sie diese Aufgabe wirklich löschen?"))) {
      deleteMutation.mutate({
        taskId: task.id,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const handleCompleteTask = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!actionTask || !household || !member) return;

    // For recurring tasks: check if the next occurrence is skipped
    const isRecurring = Boolean(actionTask.repeatInterval && actionTask.repeatUnit);
    if (isRecurring) {
      try {
        const check = await utils.tasks.checkNextOccurrence.fetch({
          taskId: actionTask.id,
          householdId: household.householdId,
        });
        if (check.skippedCount > 0) {
          // Show confirmation dialog before completing
          setSkipConfirmData({
            skippedCount: check.skippedCount,
            skippedOccurrenceDates: check.skippedOccurrenceDates,
            nextDate: check.nextDate,
            pendingCompleteData: data,
          });
          setSkipConfirmOpen(true);
          return; // Wait for user confirmation
        }
      } catch (e) {
        // If check fails, proceed with normal completion
      }
    }

    await doCompleteTask(data);
  };

  const doCompleteTask = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!actionTask || !household || !member) return;
    // Use completeTask directly (handles rotation, skip-chain, milestone in one call)
    await completeTaskMutation.mutateAsync({
      taskId: actionTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
      fileUrls: data.fileUrls,
    });
  };

  const handleAddMilestone = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!actionTask || !household || !member) return;
    await milestoneMutation.mutateAsync({
      taskId: actionTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
      fileUrls: data.fileUrls,
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
      <div className="container py-6 max-w-6xl pb-24">
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
            <h1 className="text-3xl font-bold">{t("calendar:title")}</h1>
            {household && <p className="text-muted-foreground">{household.householdName}</p>}
          </div>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {t("calendar:calendarView", "Kalenderansicht")}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t("calendar:upcomingAppointments", "Kommende Termine")}
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {t("calendar:calendarView", "Kalenderansicht")}
                  </CardTitle>
                  <Select value={eventTypeFilter} onValueChange={(value: any) => setEventTypeFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("common:actions.filter")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("calendar:filter.all", "Alle Einträge")}</SelectItem>
                      <SelectItem value="tasks">{t("calendar:filter.tasksOnly", "Nur Aufgaben")}</SelectItem>
                      <SelectItem value="borrow_events">{t("calendar:filter.borrowsOnly", "Nur Ausleihen")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <TaskCalendar
                  ref={taskCalendarRef}
                  occurrences={(() => {
                    let occs = taskOccurrences;
                    if (eventTypeFilter === "tasks") occs = occs.filter(o => !o.isCalendarEvent);
                    else if (eventTypeFilter === "borrow_events") occs = occs.filter(o => o.isCalendarEvent);
                    return occs;
                  })()}
                  renderDetail={(occ, onClose) => {
                    const item = occ.raw;
                    const isCalendarEvent = occ.isCalendarEvent;
                    if (isCalendarEvent) {
                      return (
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{item.title}</span>
                                <Badge variant="outline" className={
                                  item.eventType === "borrow_start"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : item.eventType === "borrow_return"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }>
                                  {item.eventType === "borrow_start" ? t("borrows:borrowing", "Ausleihe") : item.eventType === "borrow_return" ? t("borrows:return", "Rückgabe") : "Event"}
                                </Badge>
                              </div>
                              {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                              {item.relatedData?.item && <p className="text-xs text-muted-foreground mt-1">Item: {item.relatedData.item.name}</p>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-6 w-6"><X className="h-3 w-3" /></Button>
                          </div>
                          <Button size="sm" variant="outline" className="w-full" onClick={() => { setSelectedEvent(item); setEventDetailDialogOpen(true); onClose(); }}>
                            {t("common:actions.details", "Details")}
                          </Button>
                        </div>
                      );
                    }
                    const task = item;
                    const projectName = getProjectName(task.projectIds);
                    const frequency = getFrequencyBadge(task);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>{task.name}</span>
                              {task.isCompleted && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />{t("tasks:status.completed", "Erledigt")}</Badge>}
                              {task.isCompletedOccurrence && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />{t("calendar:completedOccurrence", "Erledigter Termin")}</Badge>}
                              {task.isFutureOccurrence && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t("calendar:futureOccurrence", "Folgetermin")}</Badge>}
                              {(task as any).isSkippedOccurrence && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><X className="h-3 w-3 mr-1" />{t("calendar:skippedOccurrence", "Ausgelassen")}</Badge>}
                              {task.isSpecialOccurrence && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Star className="h-3 w-3 mr-1" />{t("calendar:specialOccurrence", "Sondertermin")}</Badge>}
                              {!task.isCompleted && task.dueDate && isPast(new Date(task.dueDate)) && <Badge variant="destructive" className="text-xs">{t("tasks:overdue", "Überfällig")}</Badge>}
                            </div>
                            {task.occurrenceNote && (
                              <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 flex items-center gap-1">
                                <span>📝</span><span>{task.occurrenceNote}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                              <span>{getMemberNames(task.assignedTo)}</span>
                              {task.dueDate && <span>• {format(new Date(task.dueDate), "HH:mm")}{i18n.language === "de" ? " Uhr" : ""}</span>}
                              {projectName && <Badge variant="outline" className="text-xs"><FolderKanban className="h-3 w-3 mr-1" />{projectName}</Badge>}
                              <TaskDependencies taskId={task.id} allTasks={tasks} compact />
                              {frequency && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{frequency}</Badge>}
                              {task.enableRotation && <Badge variant="outline" className="text-xs"><Target className="h-3 w-3 mr-1" />{t("tasks:repeat.rotation", "Rotation")}</Badge>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-6 w-6"><X className="h-3 w-3" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" className="col-span-2" onClick={() => { const realTask = task.isCompletedOccurrence ? (tasks.find((t: any) => t.id === task.id) || task) : task; setSelectedTask(realTask); setTaskDialogOpen(true); onClose(); }}>
                            {t("common:actions.details", "Details")}
                          </Button>
                          {(task as any).isSkippedOccurrence && (() => {
                            const realTask = tasks.find((t: any) => t.id === task.id) || task;
                            const currentDueDate = realTask.dueDate ? new Date(realTask.dueDate) : null;
                            const skippedDate = new Date(task.dueDate!);
                            // Allow unskip if: skipped date is after current dueDate (future skip)
                            // OR skipped date is the one directly before current dueDate (last skipped before current)
                            const canUnskip = currentDueDate ? (
                              skippedDate >= currentDueDate || // after or equal to current → future skip
                              (() => { // check if it's directly before current
                                const advancedFromSkipped = new Date(skippedDate);
                                if (realTask.repeatUnit === 'days') advancedFromSkipped.setDate(advancedFromSkipped.getDate() + (realTask.repeatInterval || 1));
                                else if (realTask.repeatUnit === 'weeks') advancedFromSkipped.setDate(advancedFromSkipped.getDate() + (realTask.repeatInterval || 1) * 7);
                                else if (realTask.repeatUnit === 'months') advancedFromSkipped.setMonth(advancedFromSkipped.getMonth() + (realTask.repeatInterval || 1));
                                return format(advancedFromSkipped, 'yyyy-MM-dd') === format(currentDueDate, 'yyyy-MM-dd');
                              })()
                            ) : true;
                            return (
                              <>
                                <Button size="sm" variant="outline" className="col-span-2" onClick={(e) => { e.stopPropagation(); const nextDate = findNextOpenOccurrence(realTask as any); if (taskCalendarRef.current) { onClose(); taskCalendarRef.current.jumpToOccurrence(nextDate, task.id); } else { setCurrentMonth(nextDate); setSelectedDate(nextDate); toast.info(t("calendar:messages.jumpedToCurrent", "Zu aktuellem Termin gesprungen")); onClose(); } }}>
                                  <ArrowRight className="h-4 w-4 mr-1" />{t("calendar:jumpToCurrent", "Zu aktuellem Termin")}
                                </Button>
                                {canUnskip && (
                                  <Button size="sm" variant="outline" className="col-span-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" onClick={(e) => { e.stopPropagation(); const targetDate = new Date(task.dueDate!); unskipOccurrenceMutation.mutate({ taskId: task.id, householdId: household?.householdId ?? 0, memberId: member?.memberId ?? 0, dateToRestore: format(targetDate, "yyyy-MM-dd") }); onClose(); }}>
                                    <ArrowLeft className="h-4 w-4 mr-1" />{t("calendar:unskip", "Auslassen r\u00fckg\u00e4ngig")}
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                          {task.isCompletedOccurrence && (
                            <>
                              <Button size="sm" variant="outline" className="col-span-2" onClick={(e) => { e.stopPropagation(); const realTask = tasks.find((t: any) => t.id === task.id) || task; const nextDate = findNextOpenOccurrence(realTask as any); if (taskCalendarRef.current) { onClose(); taskCalendarRef.current.jumpToOccurrence(nextDate, task.id); } else { setCurrentMonth(nextDate); toast.info(t("calendar:messages.jumpedToCurrent", "Zu aktuellem Termin gesprungen")); onClose(); } }}>
                                <ArrowRight className="h-4 w-4 mr-1" />{t("calendar:jumpToCurrent", "Zu aktuellem Termin")}
                              </Button>
                              {task.activityId && (
                                <Button size="sm" variant="outline" className="col-span-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  onClick={(e) => { e.stopPropagation(); if (confirm("Möchten Sie den Abschluss dieses Termins rückgängig machen?")) { undoCompletionMutation.mutate({ taskId: task.id, householdId: household?.householdId ?? 0, memberId: member?.memberId ?? 0, activityId: task.activityId! }); onClose(); } }}>
                                  <ArrowLeft className="h-4 w-4 mr-1" />{t("common:actions.undo", "Rückgängig machen")}
                                </Button>
                              )}
                            </>
                          )}
                          {task.isFutureOccurrence && (
                            <>
                              <Button size="sm" variant="outline" className="col-span-2" onClick={(e) => { e.stopPropagation(); const nextDate = findNextOpenOccurrence(task); if (taskCalendarRef.current) { onClose(); taskCalendarRef.current.jumpToOccurrence(nextDate, task.id); } else { setCurrentMonth(nextDate); toast.info(t("calendar:messages.jumpedToCurrent", "Zu aktuellem Termin gesprungen")); onClose(); } }}>
                                <ArrowRight className="h-4 w-4 mr-1" />{t("calendar:jumpToCurrent", "Zu aktuellem Termin")}
                              </Button>
                              <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); const targetDate = task.occurrenceDate || new Date(task.dueDate!); setNoteTask({ ...task, targetDate }); setNoteText(task.occurrenceNote || ""); setNoteDialogOpen(true); onClose(); }}>
                                <span className="h-4 w-4 mr-1 text-base leading-none">📝</span>{task.occurrenceNote ? t("calendar:editNote", "Notiz bearbeiten") : t("calendar:addNote", "Notiz hinzufügen")}
                              </Button>
                              <Button size="sm" variant="outline" className="text-orange-600 hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); if (confirm(t("calendar:confirmSkip", "Möchten Sie diesen Termin auslassen?"))) { pendingPopupCloseRef.current = onClose; const targetDate = task.occurrenceDate || new Date(task.dueDate!); skipOccurrenceMutation.mutate({ taskId: task.id, householdId: household?.householdId ?? 0, memberId: member?.memberId ?? 0, dateToSkip: format(targetDate, "yyyy-MM-dd") }); } }}>
                                <X className="h-4 w-4 mr-1" />{t("calendar:skip", "Auslassen")}
                              </Button>
                            </>
                          )}
                          {!task.isCompleted && !task.isCompletedOccurrence && !task.isFutureOccurrence && !(task as any).isSkippedOccurrence && (
                            <>
                              <Button size="sm" variant="outline" onClick={async (e) => { e.stopPropagation(); setActionTask(task); pendingPopupCloseRef.current = onClose; const isRecurring = Boolean(task.repeatInterval && task.repeatUnit); if (isRecurring && household) { try { const check = await utils.tasks.checkNextOccurrence.fetch({ taskId: task.id, householdId: household.householdId }); if (check.skippedCount > 0) { setSkipConfirmData({ skippedCount: check.skippedCount, skippedOccurrenceDates: check.skippedOccurrenceDates, nextDate: check.nextDate, pendingCompleteData: { comment: undefined, photoUrls: [], fileUrls: [] } }); setSkipConfirmOpen(true); return; } } catch {} } setCompleteDialogOpen(true); }}>
                                <Check className="h-4 w-4 mr-1" />{t("tasks:actions.complete", "Abschließen")}
                              </Button>
                              <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); const targetDate = task.occurrenceDate || new Date(task.dueDate!); setNoteTask({ ...task, targetDate }); setNoteText(task.occurrenceNote || ""); setNoteDialogOpen(true); onClose(); }}>
                                <span className="h-4 w-4 mr-1 text-base leading-none">📝</span>{task.occurrenceNote ? t("calendar:editNote", "Notiz bearbeiten") : t("calendar:addNote", "Notiz hinzufügen")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionTask(task); setMilestoneDialogOpen(true); }}>
                                <Target className="h-4 w-4 mr-1" />{t("tasks:actions.milestone", "Zwischenziel")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionTask(task); setReminderDialogOpen(true); }}>
                                <Bell className="h-4 w-4 mr-1" />{t("tasks:actions.remind", "Erinnern")}
                              </Button>
                              <Button size="sm" variant="outline" className="text-orange-600 hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); if (confirm(t("calendar:confirmSkip", "Möchten Sie diesen Termin auslassen?"))) { pendingPopupCloseRef.current = onClose; const targetDate = task.occurrenceDate || new Date(task.dueDate!); skipOccurrenceMutation.mutate({ taskId: task.id, householdId: household?.householdId ?? 0, memberId: member?.memberId ?? 0, dateToSkip: format(targetDate, "yyyy-MM-dd") }); } }}>
                                <X className="h-4 w-4 mr-1" />{t("calendar:skip", "Auslassen")}
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={(e) => handleDelete(task, e)}>
                                <Trash2 className="h-4 w-4 mr-1" />{t("common:actions.delete")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
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
                    {t("calendar:upcomingAppointments", "Kommende Termine")}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{t("calendar:period", "Zeitraum")}:</span>
                    <select 
                      className="border-2 border-primary rounded-md px-3 py-1.5 text-sm font-semibold bg-primary/5 text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      value={chronologicalRange}
                      onChange={(e) => setChronologicalRange(Number(e.target.value))}
                    >
                      <option value={1}>1 {t("calendar:months", "Monate")}</option>
                      <option value={3}>3 {t("calendar:months", "Monate")}</option>
                      <option value={6}>6 {t("calendar:months", "Monate")}</option>
                      <option value={12}>12 {t("calendar:months", "Monate")}</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chronologicalTasks.length === 0 ? (
                  <div className="py-16 text-center">
                    <List className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t("tasks:noTasks", "Keine Aufgaben vorhanden")}</p>
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
                            const realTask = task.isCompletedOccurrence ? (tasks.find((t: any) => t.id === task.id) || task) : task;
                            setSelectedTask(realTask);
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
                                      {t("tasks:overdue", "Überfällig")}
                                    </Badge>
                                  )}
                                  {task.isFutureOccurrence && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                      {t("calendar:futureOccurrence", "Folgetermin")}
                                    </Badge>
                                  )}
                                  {(task as any).isSpecialOccurrence && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                      ★ {t("calendar:specialOccurrence", "Sondertermin")}
                                    </Badge>
                                  )}
                                  {task.isCompletedOccurrence && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      {t("calendar:completedOccurrence", "Erledigter Termin")}
                                    </Badge>
                                  )}
                                  {task.isCompleted && !task.isCompletedOccurrence && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      {t("tasks:completed", "Erledigt")}
                                    </Badge>
                                  )}
                                  {!task.isCompleted && !task.isFutureOccurrence && task.dueDate && isPast(new Date(task.dueDate)) && (
                                    <Badge variant="destructive" className="text-xs">
                                      {t("tasks:overdue", "Überfällig")}
                                    </Badge>
                                  )}
                                  {(task as any).isSharedWithUs && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Verknüpft mit {(task as any).householdName || "anderem Haushalt"}
                                    </Badge>
                                  )}
                                  {!(task as any).isSharedWithUs && (task as any).sharedHouseholdCount > 0 && (task as any).sharedHouseholdNames && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Geteilt mit {(task as any).sharedHouseholdNames}
                                    </Badge>
                                  )}
                                </div>
                                
                                {(task as any).occurrenceNote && (
                                  <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 flex items-center gap-1">
                                    <span>📝</span>
                                    <span>{(task as any).occurrenceNote}</span>
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span>{getMemberNames(task.assignedTo)}</span>
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
                                      {t("tasks:repeat.rotation", "Rotation")}
                                    </Badge>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {task.isCompletedOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full col-span-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const realTask = tasks.find((t: any) => t.id === task.id) || task;
                                            const nextDate = findNextOpenOccurrence(realTask as any);
                                            setCurrentMonth(nextDate);
                                            setSelectedDate(nextDate);
                                            toast.info(t("calendar:messages.jumpedToCurrent", "Zu aktuellem Termin gesprungen"));
                                          }}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-1" />
                                          {t("calendar:actions.jumpToCurrent", "Zu aktuellem Termin")}
                                        </Button>
                                        {task.activityId && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full col-span-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm(t("calendar:messages.confirmUndo", "Möchten Sie den Abschluss dieses Termins rükgängig machen? Die Aufgabe wird auf dieses Datum zurückgesetzt."))) {
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
                                            {t("calendar:actions.undo", "Rükgängig machen")}
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {task.isFutureOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full col-span-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const realTask = tasks.find((t: any) => t.id === task.id) || task;
                                            const nextDate = findNextOpenOccurrence(realTask as any);
                                            setCurrentMonth(nextDate);
                                            setSelectedDate(nextDate);
                                            toast.info(t("calendar:messages.jumpedToCurrent", "Zu aktuellem Termin gesprungen"));
                                          }}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-1" />
                                          {t("calendar:actions.jumpToCurrent", "Zu aktuellem Termin")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-blue-600 hover:bg-blue-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const targetDate = (task as any).occurrenceDate || new Date(task.dueDate!);
                                            setNoteTask({ ...task, targetDate });
                                            setNoteText((task as any).occurrenceNote || "");
                                            setNoteDialogOpen(true);
                                          }}
                                        >
                                          <span className="h-4 w-4 mr-1 text-base leading-none">📝</span>
                                          {(task as any).occurrenceNote ? t("calendar:editNote", "Notiz bearbeiten") : t("calendar:addNote", "Notiz hinzufügen")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-orange-600 hover:bg-orange-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(t("calendar:messages.confirmSkip", "Möchten Sie diesen Termin auslassen? Er wird nicht mehr im Kalender angezeigt."))) {
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
                                          {t("calendar:actions.skip", "Auslassen")}
                                        </Button>
                                      </>
                                    )}
                                    {!task.isCompleted && !task.isCompletedOccurrence && !task.isFutureOccurrence && !(task as any).isSkippedOccurrence && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setActionTask(task);
                                            const isRecurring = Boolean(task.repeatInterval && task.repeatUnit);
                                            if (isRecurring && household) {
                                              try {
                                                const check = await utils.tasks.checkNextOccurrence.fetch({
                                                  taskId: task.id,
                                                  householdId: household.householdId,
                                                });
                                                if (check.skippedCount > 0) {
                                                  setSkipConfirmData({
                                                    skippedCount: check.skippedCount,
                                                    skippedOccurrenceDates: check.skippedOccurrenceDates,
                                                    nextDate: check.nextDate,
                                                    pendingCompleteData: { comment: undefined, photoUrls: [], fileUrls: [] },
                                                  });
                                                  setSkipConfirmOpen(true);
                                                  return;
                                                }
                                              } catch {
                                                // ignore, proceed normally
                                              }
                                            }
                                            setCompleteDialogOpen(true);
                                          }}
                                        >
                                          <Check className="h-4 w-4 mr-1" />
                                          {t("tasks:actions.complete", "Abschließen")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-blue-600 hover:bg-blue-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const targetDate = (task as any).occurrenceDate || new Date(task.dueDate!);
                                            setNoteTask({ ...task, targetDate });
                                            setNoteText((task as any).occurrenceNote || "");
                                            setNoteDialogOpen(true);
                                          }}
                                        >
                                          <span className="h-4 w-4 mr-1 text-base leading-none">📝</span>
                                          {(task as any).occurrenceNote ? t("calendar:editNote", "Notiz bearbeiten") : t("calendar:addNote", "Notiz hinzufügen")}
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
                                          {t("tasks:actions.milestone", "Zwischenziel")}
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
                                          {t("tasks:actions.sendReminder", "Erinnern")}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full text-orange-600 hover:bg-orange-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(t("calendar:messages.confirmSkip", "Möchten Sie diesen Termin auslassen? Er wird nicht mehr im Kalender angezeigt."))) {
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
                                          {t("calendar:actions.skip", "Auslassen")}
                                        </Button>
                                      </>
                                    )}
                                    {!task.isCompletedOccurrence && !task.isFutureOccurrence && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={(e) => handleDelete(task, e)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                          {t("common:actions.delete", "Löschen")}
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
                    {t("calendar:tasksWithoutDates", "Aufgaben ohne Termine")} ({tasksWithoutDates.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Assignee Filter */}
                    <Select
                      value={filterAssignee?.toString() ?? "all"}
                      onValueChange={(value) => setFilterAssignee(value === "all" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder={t("members:allMembers", "Alle Mitglieder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("members:allMembers", "Alle Mitglieder")}</SelectItem>
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
                        <SelectItem value="createdAt">{t("common:labels.createdAt", "Erstellungsdatum")}</SelectItem>
                        <SelectItem value="name">{t("common:labels.name")}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Order */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      title={sortOrder === "asc" ? t("common:sort.ascending", "Aufsteigend") : t("common:sort.descending", "Absteigend")}
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
                      ? t("calendar:noTasksWithoutDatesForMember", "Keine Aufgaben ohne Termine für dieses Mitglied")
                      : t("calendar:noTasksWithoutDates", "Keine Aufgaben ohne Termine")}
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
                                      {t("tasks:completed", "Erledigt")}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span>{getMemberNames(task.assignedTo)}</span>
                                  {task.createdAt && (
                                    <span>• {t("inventory:fields.createdAt", "Erstellt am")}: {format(new Date(task.createdAt), "dd.MM.yyyy")}</span>
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
                                      {t("tasks:repeat.rotation", "Rotation")}
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
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActionTask(task);
                                        const isRecurring = Boolean(task.repeatInterval && task.repeatUnit);
                                        if (isRecurring && household) {
                                          try {
                                            const check = await utils.tasks.checkNextOccurrence.fetch({
                                              taskId: task.id,
                                              householdId: household.householdId,
                                            });
                                            if (check.skippedCount > 0) {
                                              setSkipConfirmData({
                                                skippedCount: check.skippedCount,
                                                skippedOccurrenceDates: check.skippedOccurrenceDates,
                                                nextDate: check.nextDate,
                                                pendingCompleteData: { comment: undefined, photoUrls: [], fileUrls: [] },
                                              });
                                              setSkipConfirmOpen(true);
                                              return;
                                            }
                                          } catch {
                                            // ignore, proceed normally
                                          }
                                        }
                                        setCompleteDialogOpen(true);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      {t("tasks:actions.complete")}
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
                                      {t("tasks:actions.milestone")}
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
                                      {t("tasks:actions.remind")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={(e) => handleDelete(task, e)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {t("common:actions.delete")}
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
        onTaskUpdated={(updatedTask?: any) => {
          utils.tasks.list.invalidate();
          utils.calendar.getEvents.invalidate();
          // If the updated task object is provided, sync selectedTask immediately
          if (updatedTask) {
            setSelectedTask((prev: any) => {
              if (!prev || prev.id !== updatedTask.id) return prev;
              return { ...prev, ...updatedTask };
            });
          }
        }}
      />

      {/* Action Dialogs */}
      {actionTask && (
        <>
          <CompleteTaskDialog
            open={completeDialogOpen}
            onOpenChange={setCompleteDialogOpen}
            task={(() => {
              // Determine the chronologically earliest non-skipped occurrence as the current one
              const occNotes: any[] = (actionTask as any).occurrenceNotes || [];
              const nonSkipped = occNotes.filter((n: any) => !n.isSkipped);
              const taskDueDate = actionTask.dueDate ? new Date(actionTask.dueDate) : new Date();
              const getEffDate = (occ: any) => {
                if (occ.isSpecial && occ.specialDate) return new Date(occ.specialDate);
                const steps = occ.occurrenceNumber - 1;
                const d = new Date(taskDueDate);
                const interval = actionTask.repeatInterval || 1;
                const unit = actionTask.repeatUnit;
                if (unit === 'days') d.setDate(d.getDate() + interval * steps);
                else if (unit === 'weeks') d.setDate(d.getDate() + interval * 7 * steps);
                else if (unit === 'months') d.setMonth(d.getMonth() + interval * steps);
                return d;
              };
              const sorted = [...nonSkipped].sort((a, b) => getEffDate(a).getTime() - getEffDate(b).getTime());
              const currentOcc = sorted[0] || occNotes[0];
              const isSpecial = currentOcc?.isSpecial === true && currentOcc?.specialDate != null;
              return {
                ...actionTask,
                isRecurring: Boolean(actionTask.enableRepeat || actionTask.repeatUnit || actionTask.repeatInterval),
                dueDate: isSpecial ? new Date(currentOcc.specialDate) : (actionTask.dueDate ? new Date(actionTask.dueDate) : undefined),
                isSpecialOccurrence: isSpecial,
                specialName: isSpecial ? currentOcc.specialName : undefined,
              };
            })()}
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
            task={actionTask ? {
              ...actionTask,
              assignedTo: actionTask.assignedTo && actionTask.assignedTo.length > 0
                ? actionTask.assignedTo.map((id: number) => members.find(m => m.id === id)?.memberName).filter(Boolean).join(", ")
                : undefined,
            } : null}
            onSendReminder={handleSendReminder}
          />
        </>
      )}
      
      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={eventDetailDialogOpen}
        onOpenChange={setEventDetailDialogOpen}
        event={selectedEvent}
        onMarkReturned={(borrowRequestId) => {
          if (!household || !member) return;
          markReturnedMutation.mutate({
            requestId: borrowRequestId,
          });
        }}
      />
      
      {/* Occurrence Note Dialog */}
      {noteDialogOpen && noteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNoteDialogOpen(false)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">{noteText ? t("calendar:editNote", "Notiz bearbeiten") : t("calendar:addNote", "Notiz hinzufügen")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {noteTask.name} – {format(noteTask.targetDate, "dd.MM.yyyy", { locale: dateFnsLocale })}
            </p>
            <textarea
              className="w-full border rounded-md p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("calendar:notePlaceholder", "Notiz für diesen Termin...")}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => { setNoteDialogOpen(false); setNoteTask(null); setNoteText(""); }}>
                {t("common:actions.cancel", "Abbrechen")}
              </Button>
              <Button
                onClick={() => {
                  if (!noteText.trim()) return;
                  addOccurrenceNoteMutation.mutate({
                    taskId: noteTask.id,
                    householdId: household?.householdId ?? 0,
                    memberId: member?.memberId ?? 0,
                    occurrenceDate: format(noteTask.targetDate, "yyyy-MM-dd"),
                    notes: noteText.trim(),
                  });
                }}
                disabled={!noteText.trim() || addOccurrenceNoteMutation.isPending}
              >
                {addOccurrenceNoteMutation.isPending ? t("common:loading", "...") : t("common:actions.save", "Speichern")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Skip-confirmation dialog for recurring task completion */}
      {skipConfirmOpen && skipConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSkipConfirmOpen(false)}>
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span className="text-orange-500">⚠️</span>
              {t("calendar:skipConfirm.title", "Übersprungene Termine")}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {skipConfirmData.skippedCount === 1
                ? t("calendar:skipConfirm.singleSkip", "Der nächste Termin ({{date}}) ist bereits als \"Auslassen\" markiert. Die Aufgabe wird zum übernächsten offenen Termin weitergeleitet.", {
                    date: skipConfirmData.skippedOccurrenceDates[0]
                  })
                : t("calendar:skipConfirm.multiSkip", "Die nächsten {{count}} Termine sind bereits als \"Auslassen\" markiert. Die Aufgabe wird zum nächsten offenen Termin weitergeleitet.", {
                    count: skipConfirmData.skippedCount
                  })
              }
            </p>
            {skipConfirmData.skippedOccurrenceDates.length > 0 && (
              <div className="bg-muted/50 rounded-md p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("calendar:skipConfirm.skippedDates", "Übersprungene Termine:")}</p>
                <ul className="text-sm space-y-0.5">
                  {skipConfirmData.skippedOccurrenceDates.map(d => (
                    <li key={d} className="text-orange-600">• {d}</li>
                  ))}
                </ul>
              </div>
            )}
            {skipConfirmData.nextDate && (
              <p className="text-sm font-medium mb-4">
                {t("calendar:skipConfirm.nextOpen", "Nächster offener Termin:")}{" "}
                <span className="text-primary">
                  {format(new Date(skipConfirmData.nextDate), "dd.MM.yyyy", { locale: dateFnsLocale })}
                </span>
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSkipConfirmOpen(false);
                  setSkipConfirmData(null);
                }}
              >
                {t("common:actions.cancel", "Abbrechen")}
              </Button>
              <Button
                onClick={async () => {
                  setSkipConfirmOpen(false);
                  if (skipConfirmData.pendingCompleteData) {
                    await doCompleteTask(skipConfirmData.pendingCompleteData);
                  }
                  setSkipConfirmData(null);
                }}
              >
                {t("calendar:skipConfirm.confirm", "Trotzdem abschließen")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </AppLayout>
  );
}

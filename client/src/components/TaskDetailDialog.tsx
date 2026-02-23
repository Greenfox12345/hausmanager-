import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, User, Repeat, Users, Edit, X, Check, History as HistoryIcon, ImageIcon, CheckCircle2, Target, Bell, RotateCcw, FileText, Plus, ChevronLeft, ChevronRight, ChevronDown, ArrowUp, ArrowDown, SkipForward, Trash2, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState as useStateForTabs } from "react";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { RotationScheduleTable, type ScheduleOccurrence } from "./RotationScheduleTable";
import { UpcomingOccurrencesTable } from "./UpcomingOccurrencesTable";
import { RequiredItemsSection } from "./RequiredItemsSection";
import { PhotoViewer } from "@/components/PhotoViewer";
import { PDFViewer } from "@/components/PDFViewer";

interface Task {
  id: number;
  name: string;
  description?: string | null;
  monthlyRecurrenceMode?: "same_date" | "same_weekday" | null;
  monthlyWeekday?: number | null;
  monthlyOccurrence?: number | null;
  assignedTo?: number[] | null; // Array of member IDs
  dueDate?: string | Date | null;
  enableRepeat?: boolean | null;
  repeatInterval?: number | null;
  repeatUnit?: string | null;
  enableRotation?: boolean | null;
  requiredPersons?: number | null;
  projectIds?: number[] | null;
  completed?: boolean;
  isCompleted?: boolean;
  createdBy?: number | null;
  createdAt?: string | Date | null;
  frequency?: string | null;
  customFrequencyDays?: number | null;
  skippedDates?: string[] | null;
  householdId?: number | null;
  householdName?: string | null;
  sharedHouseholdNames?: string | null;
  isSharedWithUs?: boolean | null;
  nonResponsiblePermission?: "full" | "milestones_reminders" | "view_only" | null;
  durationDays?: number | null;
  durationMinutes?: number | null;
}

interface Member {
  memberId: number;
  memberName: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onTaskUpdated?: (updatedTask: Task) => void;
  onNavigateToTask?: (taskId: number) => void;
  taskList?: Task[]; // Full list of tasks for navigation
  currentTaskIndex?: number; // Current task index in the list
  onNavigatePrevious?: () => void; // Navigate to previous task
  onNavigateNext?: () => void; // Navigate to next task
}

export function TaskDetailDialog({ task, open, onOpenChange, members, onTaskUpdated, onNavigateToTask, taskList, currentTaskIndex, onNavigatePrevious, onNavigateNext }: TaskDetailDialogProps) {
  const [, setLocation] = useLocation();
  const { household, member } = useCompatAuth();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // Action dialog states
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showShoppingItemDetail, setShowShoppingItemDetail] = useState(false);
  const [selectedShoppingItem, setSelectedShoppingItem] = useState<any>(null);
  
  // Viewer states
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<{url: string, filename: string}[]>([]);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [viewerPDF, setViewerPDF] = useState<{url: string, filename: string} | null>(null);
  
  // Load task history
  const { data: taskHistory = [] } = trpc.activities.getByTaskId.useQuery(
    { taskId: task?.id ?? 0, householdId: household?.householdId ?? 0 },
    { enabled: !!task?.id && !!household && open && activeTab === "history" }
  );
  
  // Project state (must be declared before queries that use it)
  const [isProjectTask, setIsProjectTask] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [prerequisites, setPrerequisites] = useState<number[]>([]);
  const [followups, setFollowups] = useState<number[]>([]);
  
  // Neighborhood sharing state
  const [enableSharing, setEnableSharing] = useState(false);
  const [selectedSharedHouseholds, setSelectedSharedHouseholds] = useState<number[]>([]);
  const [nonResponsiblePermission, setNonResponsiblePermission] = useState<"full" | "milestones_reminders" | "view_only">("full");
  
  // Load projects
  const { data: projects = [] } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open }
  );

  const { data: sharedHouseholds = [] } = trpc.tasks.getSharedHouseholds.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task && open }
  );
  
  // Load connected households for sharing
  // Load own household members
  const { data: ownMembers = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open }
  );
  
  const { data: connectedHouseholds = [] } = trpc.neighborhood.getConnectedHouseholds.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && isEditing }
  );
  
  // Load members from connected households when sharing is enabled
  const { data: connectedMembers = [] } = trpc.neighborhood.getConnectedMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && isEditing && enableSharing }
  );
  
  // Load available tasks for dependencies
  const { data: allAvailableTasks = [] } = trpc.projects.getAvailableTasks.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && isProjectTask }
  );
  
  // Exclude current task from available tasks (can't depend on itself)
  const availableTasks = allAvailableTasks.filter((t: any) => t.id !== task?.id);
  
  // Load task dependencies
  const { data: taskDependencies } = trpc.projects.getTaskDependencies.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id && open }
  );
  
  // Load rotation schedule
  const { data: rotationScheduleData } = trpc.tasks.getRotationSchedule.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id && open && (!!task?.enableRotation || !!task?.repeatUnit || !!task?.enableRepeat) }
  );
  
  // Load task occurrence items
  const { data: taskOccurrenceItemsData } = trpc.taskOccurrenceItems.getTaskOccurrenceItems.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id && open }
  );
  
  // Load linked shopping items
  const { data: linkedShoppingItems = [] } = trpc.shopping.getLinkedItems.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id && open }
  );
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);

  const toggleAssignee = (memberId: number) => {
    setSelectedAssignees(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [durationTime, setDurationTime] = useState("00:00"); // HH:MM format
  const [durationDays, setDurationDays] = useState("0");
  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [customFrequencyDays, setCustomFrequencyDays] = useState(1);
  const [repeatMode, setRepeatMode] = useState<"none" | "irregular" | "regular">("none");
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months" | "irregular">("weeks");
  const [monthlyRecurrenceMode, setMonthlyRecurrenceMode] = useState<"same_date" | "same_weekday">("same_date");
  const [monthlyWeekday, setMonthlyWeekday] = useState<number>(1); // 0-6 (Sunday-Saturday), default to Monday
  const [monthlyOccurrence, setMonthlyOccurrence] = useState<number>(1); // 1-5 (1st, 2nd, 3rd, 4th, last)
  const [enableRotation, setEnableRotation] = useState(false);
  const [requiredPersons, setRequiredPersons] = useState(1);
  const [excludedMembers, setExcludedMembers] = useState<number[]>([]);
  const [rotationSchedule, setRotationSchedule] = useState<ScheduleOccurrence[]>([]);
  const [isRotationPlanExpanded, setIsRotationPlanExpanded] = useState(true); // Default: expanded
  const [isUpcomingTermineExpanded, setIsUpcomingTermineExpanded] = useState(true); // Default: expanded
  const [isTerminePlanenExpanded, setIsTerminePlanenExpanded] = useState(true); // Default: expanded
  
  // Wrap setRotationSchedule in useCallback to prevent infinite re-renders in RotationScheduleTable
  // Memoize availableMembers to prevent infinite re-renders in RotationScheduleTable
  const availableMembers = useMemo(() => 
    ownMembers.map(m => ({ memberId: m.id, memberName: m.memberName })),
    [ownMembers]
  );

  // Memoize dueDateObject to prevent new Date() on every render
  const dueDateObject = useMemo(() => 
    dueDate ? new Date(dueDate) : null,
    [dueDate]
  );

  // Helper function to calculate date for an occurrence
  const calculateOccurrenceDate = useCallback((occurrenceNumber: number): Date | undefined => {
    if (!dueDateObject || repeatUnit === "irregular") return undefined;
    
    const baseDate = dueDateObject;
    const interval = parseInt(repeatInterval) || 1;
    const occNum = occurrenceNumber - 1; // 0-indexed for calculation
    
    let calculatedDate: Date | undefined = undefined;
    
    if (repeatUnit === "days") {
      calculatedDate = new Date(baseDate);
      calculatedDate.setDate(baseDate.getDate() + (interval * occNum));
    } else if (repeatUnit === "weeks") {
      calculatedDate = new Date(baseDate);
      calculatedDate.setDate(baseDate.getDate() + (interval * 7 * occNum));
    } else if (repeatUnit === "months") {
      if (monthlyRecurrenceMode === "same_weekday") {
        // First occurrence always uses the exact due date
        if (occNum === 0) {
          calculatedDate = new Date(baseDate);
        } else {
          // Calculate based on user-selected weekday occurrence (e.g., "3rd Monday")
          const targetMonth = baseDate.getMonth() + (interval * occNum);
          const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
          const normalizedMonth = targetMonth % 12;
          
          // Use stored monthlyWeekday and monthlyOccurrence values
          const weekday = monthlyWeekday ?? baseDate.getDay();
          const occurrence = monthlyOccurrence ?? Math.ceil(baseDate.getDate() / 7);
          
          // Find the Nth occurrence of the weekday in target month
          calculatedDate = new Date(targetYear, normalizedMonth, 1);
          let count = 0;
          
          while (calculatedDate.getMonth() === normalizedMonth) {
            if (calculatedDate.getDay() === weekday) {
              count++;
              if (count === occurrence) {
                break;
              }
            }
            calculatedDate.setDate(calculatedDate.getDate() + 1);
          }
          
          // If we couldn't find the occurrence (e.g., 5th Monday doesn't exist), use last occurrence
          if (calculatedDate.getMonth() !== normalizedMonth) {
            calculatedDate.setDate(calculatedDate.getDate() - 7);
          }
        }
      } else {
        // Same date mode
        calculatedDate = new Date(baseDate);
        calculatedDate.setMonth(baseDate.getMonth() + (interval * occNum));
      }
    }
    
    return calculatedDate;
  }, [dueDateObject, repeatUnit, repeatInterval, monthlyRecurrenceMode, monthlyWeekday, monthlyOccurrence]);

  // Memoize handleRotationScheduleChange to prevent function recreation on every render
  const handleRotationScheduleChange = useCallback((schedule: ScheduleOccurrence[]) => {
    // For irregular appointments: don't sort or renumber, just update the schedule as-is
    if (repeatUnit === 'irregular') {
      setRotationSchedule(schedule);
      return;
    }
    
    // For regular appointments: sort by date and renumber
    // Calculate dates for sorting (special occurrences use specialDate, regular ones calculate from occurrence number)
    const withCalculatedDates = schedule.map(occ => {
      const calculatedDate = occ.isSpecial ? undefined : calculateOccurrenceDate(occ.occurrenceNumber);
      return { ...occ, _tempCalculatedDate: calculatedDate };
    });
    
    // Sort by date (use specialDate for special, _tempCalculatedDate for regular)
    const sorted = [...withCalculatedDates].sort((a, b) => {
      const dateA = a.isSpecial ? a.specialDate : a._tempCalculatedDate;
      const dateB = b.isSpecial ? b.specialDate : b._tempCalculatedDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    // Renumber: Regular occurrences get 1, 2, 3..., Special occurrences get 1000, 1001, 1002...
    let regularCount = 1;
    let specialCount = 1000;
    const renumbered = sorted.map(occ => {
      // Remove temp field
      const { _tempCalculatedDate, ...occWithoutTemp } = occ as any;
      
      if (occ.isSpecial) {
        // Special occurrences: high numbers, keep specialDate
        return {
          ...occWithoutTemp,
          occurrenceNumber: specialCount++,
        };
      } else {
        // Regular occurrences: sequential numbers
        return {
          ...occWithoutTemp,
          occurrenceNumber: regularCount++,
        };
      }
    });
    
    setRotationSchedule(renumbered);
  }, [calculateOccurrenceDate, repeatUnit]);

  // Auto-fill monthlyWeekday and monthlyOccurrence from dueDate when switching to same_weekday mode
  useEffect(() => {
    if (monthlyRecurrenceMode === "same_weekday" && dueDateObject) {
      // Only auto-fill if values haven't been manually set (still at defaults)
      const weekday = dueDateObject.getDay();
      const occurrence = Math.ceil(dueDateObject.getDate() / 7);
      
      // Update the values to match the dueDate
      setMonthlyWeekday(weekday);
      setMonthlyOccurrence(occurrence);
    }
  }, [monthlyRecurrenceMode, dueDateObject]);

  // Reset edit mode when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);
  
  // Load task data when dialog opens or task changes
  useEffect(() => {
    if (task && open) {
      setName(task.name || "");
      setDescription(task.description || "");
      const assigneeArr = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? (typeof task.assignedTo === 'string' ? (() => { try { const p = JSON.parse(task.assignedTo); return Array.isArray(p) ? p : [p]; } catch { return []; } })() : [task.assignedTo]) : []);
      setAssignedTo(assigneeArr.length > 0 ? assigneeArr[0] : null);
      setSelectedAssignees(assigneeArr);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        // Extract date and time as-is (database returns UTC, new Date interprets as UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setDueDate(`${year}-${month}-${day}`);
        setDueTime(`${hours}:${minutes}`);
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Load duration
      setDurationDays(String(task.durationDays || 0));
      const minutes = task.durationMinutes || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setDurationTime(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
      
      // Map task data to repeat mode
      const hasRepeat = Boolean(task.enableRepeat) || (task.frequency && task.frequency !== "once");
      if (!hasRepeat) {
        setRepeatMode("none");
      } else if (task.repeatUnit === "irregular") {
        setRepeatMode("irregular");
      } else {
        setRepeatMode("regular");
      }
      
      if (hasRepeat) {
        // For irregular repeat mode, use repeatUnit directly
        if (task.repeatUnit === "irregular") {
          setRepeatUnit("irregular");
          if (task.repeatInterval) {
            setRepeatInterval(task.repeatInterval.toString());
          }
        } else if (task.frequency) {
          // Use new frequency field if available, otherwise map old repeat fields
          if (task.frequency === "daily") {
            setRepeatInterval("1");
            setRepeatUnit("days");
          } else if (task.frequency === "weekly") {
            setRepeatInterval("1");
            setRepeatUnit("weeks");
          } else if (task.frequency === "monthly") {
            setRepeatInterval("1");
            setRepeatUnit("months");
          } else if (task.frequency === "custom" && task.customFrequencyDays) {
            setRepeatInterval(task.customFrequencyDays.toString());
            setRepeatUnit("days");
          }
        } else if (task.repeatInterval && task.repeatUnit) {
          setRepeatInterval(task.repeatInterval.toString());
          setRepeatUnit(task.repeatUnit as "days" | "weeks" | "months" | "irregular");
          if (task.monthlyRecurrenceMode) {
            setMonthlyRecurrenceMode(task.monthlyRecurrenceMode as "same_date" | "same_weekday");
            if (task.monthlyWeekday !== undefined && task.monthlyWeekday !== null) {
              setMonthlyWeekday(task.monthlyWeekday);
            }
            if (task.monthlyOccurrence !== undefined && task.monthlyOccurrence !== null) {
              setMonthlyOccurrence(task.monthlyOccurrence);
            }
          }
        }
      } else {
        setRepeatInterval("1");
        setRepeatUnit("weeks");
      }
      setEnableRotation(task.enableRotation || false);
      setRequiredPersons(task.requiredPersons || 1);
      
      // Initialize project state
      setIsProjectTask(!!task.projectIds && task.projectIds.length > 0);
      setSelectedProjectIds(task.projectIds || []);
      
      // Initialize permission
      setNonResponsiblePermission(task.nonResponsiblePermission || "full");
      
      // Initialize sharing state from sharedHouseholds query (loaded separately)
      // This will be set in a separate useEffect when sharedHouseholds loads
    }
  }, [task, open]);
  
  // Load rotation schedule when data arrives (for rotation AND recurring tasks)
  useEffect(() => {
    if (rotationScheduleData && task && open && (task.enableRotation || task.enableRepeat || task.repeatUnit)) {
      // Group items by occurrence number
      const itemsByOccurrence = new Map<number, Array<{ itemId: number; itemName: string }>>();
      if (taskOccurrenceItemsData) {
        for (const item of taskOccurrenceItemsData) {
          if (!itemsByOccurrence.has(item.occurrenceNumber)) {
            itemsByOccurrence.set(item.occurrenceNumber, []);
          }
          itemsByOccurrence.get(item.occurrenceNumber)!.push({
            itemId: item.inventoryItemId,
            itemName: item.itemName || '',
          });
        }
      }
      
      const scheduleWithDates = rotationScheduleData.map((occ: any) => {
        // Calculate date for regular recurring occurrences
        let calculatedDate: Date | undefined;
        if (occ.specialDate) {
          calculatedDate = new Date(occ.specialDate);
        } else if (task.dueDate && task.repeatUnit && task.repeatUnit !== "irregular") {
          const baseDate = new Date(task.dueDate);
          const interval = task.repeatInterval || 1;
          const occNum = occ.occurrenceNumber - 1; // 0-indexed for calculation
          
          if (task.repeatUnit === "days") {
            calculatedDate = new Date(baseDate);
            calculatedDate.setDate(baseDate.getDate() + (interval * occNum));
          } else if (task.repeatUnit === "weeks") {
            calculatedDate = new Date(baseDate);
            calculatedDate.setDate(baseDate.getDate() + (interval * 7 * occNum));
          } else if (task.repeatUnit === "months") {
            if (task.monthlyRecurrenceMode === "same_weekday") {
              if (occNum === 0) {
                calculatedDate = new Date(baseDate);
              } else {
                const targetMonth = baseDate.getMonth() + (interval * occNum);
                const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
                const normalizedMonth = targetMonth % 12;
                const weekday = task.monthlyWeekday ?? baseDate.getDay();
                const occurrence = task.monthlyOccurrence ?? Math.ceil(baseDate.getDate() / 7);
                calculatedDate = new Date(targetYear, normalizedMonth, 1);
                let count = 0;
                while (calculatedDate.getMonth() === normalizedMonth) {
                  if (calculatedDate.getDay() === weekday) {
                    count++;
                    if (count === occurrence) break;
                  }
                  calculatedDate.setDate(calculatedDate.getDate() + 1);
                }
                if (calculatedDate.getMonth() !== normalizedMonth) {
                  calculatedDate.setDate(calculatedDate.getDate() - 7);
                }
              }
            } else {
              calculatedDate = new Date(baseDate);
              calculatedDate.setMonth(baseDate.getMonth() + (interval * occNum));
            }
          }
        }

        return {
          occurrenceNumber: occ.occurrenceNumber,
          members: occ.members,
          notes: occ.notes,
          date: calculatedDate, // Calculated date for regular occurrences
          isSkipped: occ.isSkipped || false,
          isSpecial: occ.isSpecial || false,
          specialName: occ.specialName,
          specialDate: occ.specialDate ? new Date(occ.specialDate) : undefined,
          items: itemsByOccurrence.get(occ.occurrenceNumber) || [],
        };
      });
      setRotationSchedule(scheduleWithDates);
    }
  }, [rotationScheduleData, taskOccurrenceItemsData, task?.id, task?.enableRotation, task?.enableRepeat, task?.repeatUnit, task?.repeatInterval, task?.dueDate, task?.monthlyRecurrenceMode, task?.monthlyWeekday, task?.monthlyOccurrence, open]);
  
  // Load existing dependencies when taskDependencies are fetched
  useEffect(() => {
    if (taskDependencies && task && open) {
      // taskDependencies is an object with { prerequisites: [], followups: [] }
      const prereqIds = taskDependencies.prerequisites?.map(dep => dep.id) || [];
      const followupIds = taskDependencies.followups?.map(dep => dep.id) || [];
      
      console.log('[TaskDetailDialog] Loading dependencies:', { prereqIds, followupIds, taskDependencies });
      
      setPrerequisites(prereqIds);
      setFollowups(followupIds);
    }
  }, [taskDependencies, task, open]);
  
  // Track previous sharedHouseholds to prevent infinite loop
  const prevSharedHouseholdsRef = useRef<number[]>([]);
  
  // Load existing shared households when sharedHouseholds are fetched
  useEffect(() => {
    if (sharedHouseholds && task && open) {
      const householdIds = sharedHouseholds.map((sh: any) => sh.id);
      
      // Only update if values actually changed (deep comparison)
      const hasChanged = 
        householdIds.length !== prevSharedHouseholdsRef.current.length ||
        !householdIds.every((id, i) => id === prevSharedHouseholdsRef.current[i]);
      
      if (hasChanged) {
        prevSharedHouseholdsRef.current = householdIds;
        
        setEnableSharing(householdIds.length > 0);
        setSelectedSharedHouseholds(householdIds);
      }
    }
  }, [sharedHouseholds, task, open]);

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: async (data, variables) => {
      // All coordination happens in handleSave
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const setRotationScheduleMutation = trpc.tasks.setRotationSchedule.useMutation();
  const addItemToOccurrenceMutation = trpc.taskOccurrenceItems.addItemToOccurrence.useMutation();
  const removeItemFromOccurrenceMutation = trpc.taskOccurrenceItems.removeItemFromOccurrence.useMutation();
  const removeAllTaskItemsMutation = trpc.taskOccurrenceItems.removeAllTaskItems.useMutation();
  const skipRotationOccurrenceMutation = trpc.tasks.skipRotationOccurrence.useMutation({
    onSuccess: async () => {
      // Reload rotation schedule from server after skip
      if (task?.id) {
        const updated = await utils.tasks.getRotationSchedule.fetch({ taskId: task.id });
        setRotationSchedule(updated);
      }
    },
  });
  
  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();
  const updateDependenciesMutation = trpc.projects.updateDependencies.useMutation();
  
  // Restore task mutation
  const restoreTask = trpc.tasks.toggleComplete.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe wiederhergestellt");
      utils.tasks.list.invalidate();
      utils.activities.getByTaskId.invalidate();
      if (onTaskUpdated && task) {
        onTaskUpdated({ ...task, isCompleted: false, completed: false });
      }
    },
    onError: () => {
      toast.error("Fehler beim Wiederherstellen der Aufgabe");
    },
  });
  
  // Restore skipped date mutation
  const restoreSkippedDateMutation = trpc.tasks.restoreSkippedDate.useMutation({
    onSuccess: () => {
      toast.success("Ausgelassener Termin wiederhergestellt");
      utils.tasks.list.invalidate();
      if (onTaskUpdated && task) {
        // Refresh the task to show updated skippedDates
        onTaskUpdated(task);
      }
    },
    onError: () => {
      toast.error("Fehler beim Wiederherstellen des Termins");
    },
  });

  const handleSave = async () => {
    if (!household || !task) return;
    
    if (selectedAssignees.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Verantwortlichen");
      return;
    }

    // Send date and time separately to avoid timezone issues
    const dueDateString = dueDate || null;
    const dueTimeString = dueTime || null;

    // Determine frequency based on repeat settings
    let frequency: "once" | "daily" | "weekly" | "monthly" | "custom" = "once";
    let customFrequencyDays: number | undefined = undefined;
    
    if (repeatMode !== "none") {
      const interval = parseInt(repeatInterval) || 1;
      if (repeatUnit === "days" && interval === 1) {
        frequency = "daily";
      } else if (repeatUnit === "weeks" && interval === 1) {
        frequency = "weekly";
      } else if (repeatUnit === "months" && interval === 1) {
        frequency = "monthly";
      } else {
        frequency = "custom";
        customFrequencyDays = repeatUnit === "days" ? interval : repeatUnit === "weeks" ? interval * 7 : interval * 30;
      }
    }

    try {
      // Step 1: Update task
      await updateTask.mutateAsync({
        householdId: household.householdId,
        memberId: member?.memberId || 0,
        taskId: task.id,
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        assignedTo: selectedAssignees.length > 0 ? selectedAssignees : undefined,
        dueDate: dueDateString || undefined,
        dueTime: dueTimeString || undefined,
        durationDays: parseInt(durationDays) || 0,
        durationMinutes: (() => {
          const [hours, minutes] = durationTime.split(':').map(Number);
          return (hours || 0) * 60 + (minutes || 0);
        })(),
        frequency: frequency,
        customFrequencyDays: customFrequencyDays,
        repeatInterval: repeatMode !== "none" ? parseInt(repeatInterval) : undefined,
        repeatUnit: repeatMode !== "none" ? repeatUnit : undefined,
        irregularRecurrence: repeatMode === "irregular",
        monthlyRecurrenceMode: repeatMode === "regular" && repeatUnit === "months" ? monthlyRecurrenceMode : undefined,
        monthlyWeekday: repeatMode === "regular" && repeatUnit === "months" && monthlyRecurrenceMode === "same_weekday" ? monthlyWeekday : undefined,
        monthlyOccurrence: repeatMode === "regular" && repeatUnit === "months" && monthlyRecurrenceMode === "same_weekday" ? monthlyOccurrence : undefined,
        enableRotation: repeatMode !== "none" && enableRotation,
        requiredPersons: repeatMode !== "none" && enableRotation ? requiredPersons : undefined,
        excludedMembers: repeatMode !== "none" && enableRotation ? excludedMembers : undefined,
        projectIds: isProjectTask ? selectedProjectIds : [],
        sharedHouseholdIds: enableSharing ? selectedSharedHouseholds : [],
        nonResponsiblePermission: enableSharing && selectedSharedHouseholds.length > 0 ? nonResponsiblePermission : "full",
      });
      
      // Step 1.5: Save rotation schedule if repeat mode is not none and schedule exists
      if (repeatMode !== "none" && rotationSchedule.length > 0) {
        const schedulePayload = rotationSchedule.map(occ => ({
          occurrenceNumber: occ.occurrenceNumber,
          // Filter out unassigned AND trim to requiredPersons count
          members: occ.members
            .filter(m => m.memberId !== 0)
            .slice(0, requiredPersons || occ.members.length),
          notes: occ.notes,
          isSkipped: occ.isSkipped, // Preserve skip status
          isSpecial: occ.isSpecial, // Preserve special occurrence flag
          specialName: occ.specialName, // Preserve special occurrence name
          specialDate: occ.specialDate, // For special occurrences and irregular appointments
        }));
        
        console.log('🔍 Sending rotation schedule to server:', JSON.stringify(schedulePayload, null, 2));
        
        await setRotationScheduleMutation.mutateAsync({
          taskId: task.id,
          schedule: schedulePayload,
        });
        
        // Save items for each occurrence (intelligent update)
        // Load existing items from database
        const existingItems = await utils.taskOccurrenceItems.getTaskOccurrenceItems.fetch({ taskId: task.id });
        
        // Build map of current items from rotationSchedule
        const currentItemsMap = new Map<string, { occurrenceNumber: number; itemId: number }>();
        for (const occ of rotationSchedule) {
          if (occ.items && occ.items.length > 0) {
            for (const item of occ.items) {
              const key = `${occ.occurrenceNumber}-${item.itemId}`;
              currentItemsMap.set(key, { occurrenceNumber: occ.occurrenceNumber, itemId: item.itemId });
            }
          }
        }
        
        // Build map of existing items from database
        const existingItemsMap = new Map<string, number>();
        for (const item of existingItems) {
          const key = `${item.occurrenceNumber}-${item.inventoryItemId}`;
          existingItemsMap.set(key, item.id);
        }
        
        // Delete items that are in DB but not in current list
        for (const [key, itemId] of existingItemsMap) {
          if (!currentItemsMap.has(key)) {
            await removeItemFromOccurrenceMutation.mutateAsync({ itemId });
          }
        }
        
        // Add items that are in current list but not in DB
        for (const [key, { occurrenceNumber, itemId }] of currentItemsMap) {
          if (!existingItemsMap.has(key)) {
            await addItemToOccurrenceMutation.mutateAsync({
              taskId: task.id,
              occurrenceNumber,
              inventoryItemId: itemId,
            });
          }
        }
        // Items that are in both lists are left unchanged (preserves borrow details)
      }
      
      // Step 2: Update dependencies (BEFORE invalidating)
      // If isProjectTask is false, clear all dependencies
      // If isProjectTask is true, update with current selections
      await updateDependenciesMutation.mutateAsync({
        taskId: task.id,
        householdId: household.householdId,
        prerequisites: isProjectTask && prerequisites.length > 0 ? prerequisites : undefined,
        followups: isProjectTask && followups.length > 0 ? followups : undefined,
      });
      
      // Step 3: Invalidate all queries ONCE (after both mutations complete)
      await utils.tasks.list.invalidate();
      await utils.tasks.getRotationSchedule.invalidate({ taskId: task.id });
      await utils.tasks.getSharedHouseholds.invalidate({ taskId: task.id });
      await utils.projects.getTaskDependencies.invalidate({ taskId: task.id });
      await utils.projects.getDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
      await utils.projects.getAllDependencies.invalidate({ householdId: household.householdId });
      await utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId: task.id });
      
      // Step 4: Refetch dependencies to update dialog UI
      const updatedDependencies = await utils.projects.getTaskDependencies.fetch({ taskId: task.id });
      if (updatedDependencies) {
        setPrerequisites(updatedDependencies.prerequisites?.map(dep => dep.id) || []);
        setFollowups(updatedDependencies.followups?.map(dep => dep.id) || []);
      }
      
      // Step 5: Fetch fresh task and notify parent
      const refreshedTasks = await utils.tasks.list.fetch({ householdId: household.householdId });
      const updatedTask = refreshedTasks.find(t => t.id === task.id);
      
      if (updatedTask && onTaskUpdated) {
        onTaskUpdated(updatedTask);
      }
      
      // Step 6: Update UI state
      setIsEditing(false);
      toast.success("Aufgabe aktualisiert");
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Aktualisieren der Aufgabe");
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (task) {
      setName(task.name || "");
      setDescription(task.description || "");
      const assigneeArr = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? (typeof task.assignedTo === 'string' ? (() => { try { const p = JSON.parse(task.assignedTo); return Array.isArray(p) ? p : [p]; } catch { return []; } })() : [task.assignedTo]) : []);
      setAssignedTo(assigneeArr.length > 0 ? assigneeArr[0] : null);
      setSelectedAssignees(assigneeArr);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        // Extract date and time as-is (database returns UTC, new Date interprets as UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setDueDate(`${year}-${month}-${day}`);
        setDueTime(`${hours}:${minutes}`);
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Load duration
      setDurationDays(String(task.durationDays || 0));
      const minutes = task.durationMinutes || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      setDurationTime(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
      
      // Map task data to repeat mode
      const hasRepeat = Boolean(task.enableRepeat) || (task.frequency && task.frequency !== "once");
      if (!hasRepeat) {
        setRepeatMode("none");
      } else if (task.repeatUnit === "irregular") {
        setRepeatMode("irregular");
      } else {
        setRepeatMode("regular");
      }
      
      if (hasRepeat) {
        // For irregular repeat mode, use repeatUnit directly
        if (task.repeatUnit === "irregular") {
          setRepeatUnit("irregular");
          if (task.repeatInterval) {
            setRepeatInterval(task.repeatInterval.toString());
          }
        } else if (task.frequency) {
          // Use new frequency field if available, otherwise map old repeat fields
          if (task.frequency === "daily") {
            setRepeatInterval("1");
            setRepeatUnit("days");
          } else if (task.frequency === "weekly") {
            setRepeatInterval("1");
            setRepeatUnit("weeks");
          } else if (task.frequency === "monthly") {
            setRepeatInterval("1");
            setRepeatUnit("months");
          } else if (task.frequency === "custom" && task.customFrequencyDays) {
            setRepeatInterval(task.customFrequencyDays.toString());
            setRepeatUnit("days");
          }
        } else if (task.repeatInterval && task.repeatUnit) {
          setRepeatInterval(task.repeatInterval.toString());
          setRepeatUnit(task.repeatUnit as "days" | "weeks" | "months" | "irregular");
          if (task.monthlyRecurrenceMode) {
            setMonthlyRecurrenceMode(task.monthlyRecurrenceMode as "same_date" | "same_weekday");
            if (task.monthlyWeekday !== undefined && task.monthlyWeekday !== null) {
              setMonthlyWeekday(task.monthlyWeekday);
            }
            if (task.monthlyOccurrence !== undefined && task.monthlyOccurrence !== null) {
              setMonthlyOccurrence(task.monthlyOccurrence);
            }
          }
        }
      } else {
        setRepeatInterval("1");
        setRepeatUnit("weeks");
      }
      setEnableRotation(task.enableRotation || false);
      setRequiredPersons(task.requiredPersons || 1);
    }
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  if (!task) return null;

  const assignedMemberIds = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? (typeof task.assignedTo === 'string' ? (() => { try { const p = JSON.parse(task.assignedTo as any); return Array.isArray(p) ? p : [p]; } catch { return []; } })() : [task.assignedTo as any]) : []);
  const assignedMemberNames = assignedMemberIds.map((id: number) => {
    const member = ownMembers.find(m => m.id === id) || members.find(m => m.memberId === id);
    return member?.memberName || "Unbekannt";
  }).join(", ") || "Nicht zugewiesen";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {taskList && taskList.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onNavigatePrevious}
                    disabled={currentTaskIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {(currentTaskIndex ?? 0) + 1} / {taskList.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onNavigateNext}
                    disabled={currentTaskIndex === (taskList.length - 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <span>{isEditing ? "Aufgabe bearbeiten" : "Aufgabendetails"}</span>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Bearbeiten
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isEditing ? (
            // Edit Mode
            <>
              <div className="space-y-2">
                <Label htmlFor="task-name">Aufgabenname *</Label>
                <Input
                  id="task-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Müll rausbringen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Beschreibung</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Zusätzliche Details zur Aufgabe..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Verantwortliche *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {/* Own household members */}
                  {ownMembers.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`edit-assignee-${m.id}`}
                        checked={selectedAssignees.includes(m.id)}
                        onCheckedChange={() => toggleAssignee(m.id)}
                      />
                      <Label htmlFor={`edit-assignee-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Connected household members (only if sharing enabled and households selected) */}
                  {enableSharing && selectedSharedHouseholds.length > 0 && connectedMembers
                    .filter((cm: any) => {
                      // Filter out duplicates: if member exists in own household (same userId), don't show from connected
                      return !ownMembers.some((m: any) => {
                        // If both have userId and they match, it's a duplicate
                        if (m.userId && cm.userId && m.userId === cm.userId) {
                          return true;
                        }
                        // If both have NULL userId, check name + household to avoid duplicates
                        if (!m.userId && !cm.userId && m.memberName === cm.memberName) {
                          return true;
                        }
                        return false;
                      });
                    })
                    .map((m: any) => (
                      <div key={`connected-${m.id}`} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors bg-blue-50 dark:bg-blue-950">
                        <Checkbox
                          id={`edit-connected-assignee-${m.id}`}
                          checked={selectedAssignees.includes(m.id)}
                          onCheckedChange={() => toggleAssignee(m.id)}
                        />
                        <Label htmlFor={`edit-connected-assignee-${m.id}`} className="cursor-pointer flex-1 text-sm">
                          {m.memberName} <span className="text-xs text-muted-foreground">({m.householdName})</span>
                        </Label>
                      </div>
                    ))
                  }
                </div>
                {selectedAssignees.length === 0 && (
                  <p className="text-xs text-destructive">Bitte wählen Sie mindestens einen Verantwortlichen</p>
                )}
              </div>

              {/* Connected Households Info */}
              {task && (task.isSharedWithUs || (task.sharedHouseholdNames && task.sharedHouseholdNames.length > 0)) && (
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {task.isSharedWithUs ? (
                          <>
                            Diese Aufgabe ist verknüpft mit <span className="font-semibold">{task.householdName || "anderem Haushalt"}</span>
                          </>
                        ) : (
                          <>
                            Diese Aufgabe wurde geteilt mit <span className="font-semibold">{task.sharedHouseholdNames}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Neighborhood Sharing */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable-sharing"
                    checked={enableSharing}
                    onCheckedChange={(checked) => {
                      setEnableSharing(!!checked);
                      if (!checked) {
                        setSelectedSharedHouseholds([]);
                      }
                    }}
                  />
                  <Label htmlFor="enable-sharing" className="cursor-pointer font-semibold">
                    Mit Nachbarn teilen
                  </Label>
                </div>

                {enableSharing && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Haushalte auswählen</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                        {connectedHouseholds.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Keine verbundenen Haushalte</p>
                        ) : (
                          connectedHouseholds.map((h: any) => (
                            <div key={h.id} className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50 transition-colors">
                              <Checkbox
                                id={`household-${h.id}`}
                                checked={selectedSharedHouseholds.includes(h.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSharedHouseholds([...selectedSharedHouseholds, h.id]);
                                  } else {
                                    setSelectedSharedHouseholds(selectedSharedHouseholds.filter(id => id !== h.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`household-${h.id}`} className="cursor-pointer flex-1">
                                {h.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Permission selector for shared tasks */}
                    {selectedSharedHouseholds.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Berechtigungen für nicht-verantwortliche Mitglieder:</Label>
                        <Select value={nonResponsiblePermission} onValueChange={(value: any) => setNonResponsiblePermission(value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Vollzugriff (alles bearbeiten)</SelectItem>
                            <SelectItem value="milestones_reminders">Zwischenziele & Erinnerungen</SelectItem>
                            <SelectItem value="view_only">Nur ansehen</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Legt fest, was Mitglieder aus verbundenen Haushalten ändern dürfen.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Fälligkeitsdatum</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-time">Uhrzeit</Label>
                  <Input
                    id="task-due-time"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-duration-time">Dauer (Stunden:Minuten)</Label>
                  <Input
                    id="task-duration-time"
                    type="time"
                    value={durationTime}
                    onChange={(e) => setDurationTime(e.target.value)}
                    placeholder="00:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-duration-days">Dauer (Tage)</Label>
                  <Input
                    id="task-duration-days"
                    type="number"
                    min="0"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* End date/time display */}
              {(dueDate && (parseInt(durationDays) > 0 || durationTime !== "00:00")) && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Terminende:</strong>{" "}
                    {(() => {
                      const start = new Date(dueDate + (dueTime ? `T${dueTime}` : 'T00:00'));
                      const daysInMs = (parseInt(durationDays) || 0) * 24 * 60 * 60 * 1000;
                      const [hours, minutes] = durationTime.split(':').map(Number);
                      const timeInMs = ((hours || 0) * 60 + (minutes || 0)) * 60 * 1000;
                      const end = new Date(start.getTime() + daysInMs + timeInMs);
                      return end.toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    })()}
                  </p>
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="repeatMode" className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Wiederholungsmodus
                  </Label>
                  <Select value={repeatMode} onValueChange={(v) => {
                    setRepeatMode(v as any);
                    if (v === "irregular") {
                      setRepeatUnit("irregular");
                    } else if (v === "regular" && repeatUnit === "irregular") {
                      setRepeatUnit("weeks");
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ohne Wiederholung</SelectItem>
                      <SelectItem value="irregular">Unregelmäßig wiederholen</SelectItem>
                      <SelectItem value="regular">Regelmäßig wiederholen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {repeatMode !== "none" && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    {repeatMode === "irregular" && (
                      <p className="text-sm text-muted-foreground">
                        Bei unregelmäßiger Wiederholung werden Termine als "Termin 1", "Termin 2" usw. angezeigt.
                      </p>
                    )}
                    
                    {repeatMode === "regular" && (
                      <div className="space-y-2">
                        <Label>Wiederholungsintervall</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={repeatInterval}
                            onChange={(e) => setRepeatInterval(e.target.value)}
                            className="w-20"
                          />
                          <Select value={repeatUnit} onValueChange={(v) => setRepeatUnit(v as any)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Tage(n)</SelectItem>
                              <SelectItem value="weeks">Woche(n)</SelectItem>
                              <SelectItem value="months">Monat(e)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Monthly recurrence mode - only shown when repeatUnit is months and mode is regular */}
                    {repeatMode === "regular" && repeatUnit === "months" && (
                      <div className="space-y-2 pl-6 border-l-2 border-muted">
                        <Label>Monatliche Wiederholung</Label>
                        <Select value={monthlyRecurrenceMode} onValueChange={(v) => setMonthlyRecurrenceMode(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="same_date">Am gleichen Tag (z.B. jeden 15.)</SelectItem>
                            <SelectItem value="same_weekday">Fester Wochentag</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Weekday and occurrence selection - only shown for same_weekday mode */}
                        {monthlyRecurrenceMode === "same_weekday" && (
                          <div className="space-y-3 mt-3 pl-4 border-l-2 border-muted">
                            <div className="space-y-2">
                              <Label>Welcher im Monat</Label>
                              <Select value={monthlyOccurrence.toString()} onValueChange={(v) => setMonthlyOccurrence(parseInt(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1. (erster)</SelectItem>
                                  <SelectItem value="2">2. (zweiter)</SelectItem>
                                  <SelectItem value="3">3. (dritter)</SelectItem>
                                  <SelectItem value="4">4. (vierter)</SelectItem>
                                  <SelectItem value="5">Letzter</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Wochentag</Label>
                              <Select value={monthlyWeekday.toString()} onValueChange={(v) => setMonthlyWeekday(parseInt(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Montag</SelectItem>
                                  <SelectItem value="2">Dienstag</SelectItem>
                                  <SelectItem value="3">Mittwoch</SelectItem>
                                  <SelectItem value="4">Donnerstag</SelectItem>
                                  <SelectItem value="5">Freitag</SelectItem>
                                  <SelectItem value="6">Samstag</SelectItem>
                                  <SelectItem value="0">Sonntag</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rotation Schedule Planning - shown when repeat mode is not none */}
                    <div className="space-y-3 pl-6 border-l-2 border-muted">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setIsTerminePlanenExpanded(!isTerminePlanenExpanded)}
                            className="flex items-center gap-2 flex-1 text-left hover:opacity-70 transition-opacity"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isTerminePlanenExpanded ? 'rotate-0' : '-rotate-90'}`} />
                            <div className="space-y-1">
                              <Label className="text-sm font-medium cursor-pointer">Termine Planen</Label>
                              <p className="text-xs text-muted-foreground">
                                Fügen Sie Notizen für spezifische Termine hinzu
                              </p>
                            </div>
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Trigger the special appointment dialog in RotationScheduleTable
                              // We'll pass a callback to open it
                              const event = new CustomEvent('openSpecialAppointmentDialog');
                              window.dispatchEvent(event);
                            }}
                            className="gap-2 shrink-0"
                          >
                            <Star className="h-4 w-4" />
                            Sondertermin
                          </Button>
                        </div>
                        
                        {isTerminePlanenExpanded && (<>
                        
                        {/* Notes Table */}
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left text-sm font-medium w-32">Datum</th>
                                <th className="p-2 text-left text-sm font-medium">Notizen</th>
                                <th className="p-2 text-center text-sm font-medium w-40">Aktionen</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rotationSchedule.map((occ) => {
                                const hasNotes = occ.notes && occ.notes.trim().length > 0;
                                return (
                                  <tr key={occ.occurrenceNumber} className={`border-t ${occ.isSkipped ? 'opacity-60' : ''}`}>
                                     <td className="p-2">
                                      <div className="flex flex-col gap-1">
                                        {occ.isSpecial ? (
                                          // Editable special appointment name
                                          <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-600 fill-yellow-600 shrink-0" />
                                            <Input
                                              value={occ.specialName || ""}
                                              onChange={(e) => {
                                                handleRotationScheduleChange(
                                                  rotationSchedule.map(o =>
                                                    o.occurrenceNumber === occ.occurrenceNumber
                                                      ? { ...o, specialName: e.target.value }
                                                      : o
                                                  )
                                                );
                                              }}
                                              className="h-7 text-sm text-yellow-700 dark:text-yellow-500 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-yellow-500 px-1"
                                              placeholder="Sondertermin-Name"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 shrink-0"
                                              onClick={() => {
                                                if (confirm("Möchten Sie diesen Sondertermin wirklich zurücksetzen? Er wird zu einem regulären Termin.")) {
                                                  handleRotationScheduleChange(
                                                    rotationSchedule.map(o =>
                                                      o.occurrenceNumber === occ.occurrenceNumber
                                                        ? { ...o, isSpecial: false, specialName: undefined, specialDate: undefined }
                                                        : o
                                                    )
                                                  );
                                                }
                                              }}
                                              title="Sondertermin zurücksetzen"
                                            >
                                              <RotateCcw className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ) : (
                                          // Regular appointment (non-editable)
                                          <span className={`text-sm font-medium ${occ.isSkipped ? 'line-through' : ''}`}>
                                            Termin {occ.occurrenceNumber}
                                          </span>
                                        )}
                                        {occ.isSpecial || repeatUnit === 'irregular' ? (
                                          // Editable date with calendar (special appointments or irregular schedules)
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                className={`h-6 text-xs px-1 justify-start ${
                                                  occ.isSpecial 
                                                    ? 'hover:bg-yellow-100 dark:hover:bg-yellow-950 text-muted-foreground' 
                                                    : occ.specialDate
                                                      ? 'hover:bg-accent text-muted-foreground'
                                                      : 'hover:bg-accent text-muted-foreground italic'
                                                }`}
                                              >
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {occ.specialDate 
                                                  ? format(new Date(occ.specialDate), "dd.MM.yyyy", { locale: de })
                                                  : "Datum eingeben"
                                                }
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                              <CalendarComponent
                                                mode="single"
                                                selected={occ.specialDate ? new Date(occ.specialDate) : undefined}
                                                onSelect={(date) => {
                                                  if (date) {
                                                    handleRotationScheduleChange(
                                                      rotationSchedule.map(o =>
                                                        o.occurrenceNumber === occ.occurrenceNumber
                                                          ? { ...o, specialDate: date }
                                                          : o
                                                      )
                                                    );
                                                  }
                                                }}
                                                locale={de}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        ) : (
                                          // Regular appointment date (auto-calculated, non-editable)
                                          calculateOccurrenceDate(occ.occurrenceNumber) && (
                                            <span className="text-xs text-muted-foreground">
                                              {format(calculateOccurrenceDate(occ.occurrenceNumber)!, "dd.MM.yyyy", { locale: de })}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <Textarea
                                        placeholder="Notiz hinzufügen..."
                                        value={occ.notes || ""}
                                        onChange={(e) => {
                                          handleRotationScheduleChange(
                                            rotationSchedule.map(o =>
                                              o.occurrenceNumber === occ.occurrenceNumber
                                                ? { ...o, notes: e.target.value }
                                                : o
                                            )
                                          );
                                        }}
                                        className="min-h-[60px] resize-none"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <div className="flex gap-1 justify-center items-start pt-2">
                                        <Button
                                          type="button"
                                          variant={occ.isSkipped ? "default" : "ghost"}
                                          size="sm"
                                          onClick={async () => {
                                            if (task?.id) {
                                              // Save to DB immediately - query refetch will update "Kommende Termine"
                                              try {
                                                await skipRotationOccurrenceMutation.mutateAsync({
                                                  taskId: task.id,
                                                  occurrenceNumber: occ.occurrenceNumber,
                                                });
                                                // Also update local state for "Termine Planen" table
                                                handleRotationScheduleChange(
                                                  rotationSchedule.map(o =>
                                                    o.occurrenceNumber === occ.occurrenceNumber
                                                      ? { ...o, isSkipped: !o.isSkipped }
                                                      : o
                                                  )
                                                );
                                              } catch (error) {
                                                console.error('Failed to skip occurrence:', error);
                                              }
                                            } else {
                                              // No taskId: just update local state (for task creation)
                                              handleRotationScheduleChange(
                                                rotationSchedule.map(o =>
                                                  o.occurrenceNumber === occ.occurrenceNumber
                                                    ? { ...o, isSkipped: !o.isSkipped }
                                                    : o
                                                )
                                              );
                                            }
                                          }}
                                          title={occ.isSkipped ? "Überspringen rückgängig machen" : "Überspringen"}
                                          className={`h-7 w-7 p-0 ${occ.isSkipped ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                                        >
                                          <SkipForward className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const updated = rotationSchedule.filter(o => o.occurrenceNumber !== occ.occurrenceNumber);
                                            const renumbered = updated.map((o, i) => ({ ...o, occurrenceNumber: i + 1 }));
                                            handleRotationScheduleChange(renumbered);
                                          }}
                                          title="Löschen"
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Add Occurrence Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const nextOccurrenceNumber = rotationSchedule.length + 1;
                            const newOccurrence: ScheduleOccurrence = {
                              occurrenceNumber: nextOccurrenceNumber,
                              members: Array.from({ length: requiredPersons }, (_, i) => ({
                                position: i + 1,
                                memberId: 0,
                              })),
                              notes: "",
                            };
                            handleRotationScheduleChange([...rotationSchedule, newOccurrence]);
                          }}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Termin hinzufügen
                        </Button>
                        </>)}
                      </div>

                    {/* Rotation checkbox - nested under repeat */}
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                      <Switch
                        id="enableRotation"
                        checked={enableRotation}
                        onCheckedChange={(checked) => {
                          setEnableRotation(checked);
                          // Initialize empty schedule when rotation is first enabled
                          if (checked && rotationSchedule.length === 0) {
                            setRotationSchedule([]);
                          }
                        }}
                      />
                      <Label htmlFor="enableRotation" className="cursor-pointer flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Verantwortung rotieren
                      </Label>
                    </div>

                    {enableRotation && (
                      <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                        <div className="space-y-2">
                          <Label htmlFor="required-persons">Anzahl Personen pro Durchgang</Label>
                          <Input
                            id="required-persons"
                            type="number"
                            min="1"
                            max={members.length}
                            value={requiredPersons}
                            onChange={(e) => setRequiredPersons(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Freistellen</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Mitglieder, die von der Rotation ausgeschlossen werden
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                            {ownMembers.map((m) => (
                              <div key={m.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`exclude-${m.id}`}
                                  checked={excludedMembers.includes(m.id)}
                                  onCheckedChange={(checked) => {
                                    setExcludedMembers(prev =>
                                      checked
                                        ? [...prev, m.id]
                                        : prev.filter(id => id !== m.id)
                                    );
                                  }}
                                />
                                <Label htmlFor={`exclude-${m.id}`} className="cursor-pointer text-sm flex-1">
                                  {m.memberName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rotation Schedule Table - Only show in edit mode */}
                        {task?.id ? (
                          <div className="space-y-2 border-t pt-4 mt-4">
                            <button
                              type="button"
                              onClick={() => setIsRotationPlanExpanded(!isRotationPlanExpanded)}
                              className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isRotationPlanExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              <Label className="text-sm font-medium cursor-pointer">Rotationsplan</Label>
                            </button>
                            {isRotationPlanExpanded && (
                              <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  Planen Sie im Voraus, wer bei welchem Termin verantwortlich ist
                                </p>
                                <RotationScheduleTable
                            taskId={task?.id}
                            householdId={household?.householdId ?? 0}
                            requiredPersons={requiredPersons}
                            availableMembers={availableMembers}
                            currentAssignees={selectedAssignees}
                            repeatInterval={parseInt(repeatInterval) || 1}
                            repeatUnit={repeatUnit}
                            monthlyRecurrenceMode={monthlyRecurrenceMode}
                            monthlyWeekday={monthlyWeekday}
                            monthlyOccurrence={monthlyOccurrence}
                            dueDate={dueDateObject}
                            onChange={handleRotationScheduleChange}
                            initialSchedule={rotationSchedule}
                            excludedMemberIds={excludedMembers}
                            onSkipOccurrence={async (occurrenceNumber: number, isSkipped: boolean) => {
                              if (!task?.id) return;
                              await skipRotationOccurrenceMutation.mutateAsync({
                                taskId: task.id,
                                occurrenceNumber,
                                isSkipped,
                              } as any);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const newOccurrence: ScheduleOccurrence = {
                                occurrenceNumber: rotationSchedule.length + 1,
                                members: selectedAssignees.map((id, i) => ({
                                  position: i + 1,
                                  memberId: id,
                                })),
                                notes: "",
                              };
                              handleRotationScheduleChange([...rotationSchedule, newOccurrence]);
                            }}
                            className="w-full gap-2 mt-3"
                          >
                            <Plus className="h-4 w-4" />
                            Termin hinzufügen
                          </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 border-t pt-4 mt-4">
                            <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Rotationsplanung und Terminnotizen sind nach dem Erstellen der Aufgabe verfügbar</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Skipped Dates */}
                {task.repeatInterval && task.repeatUnit && task.skippedDates && task.skippedDates.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Ausgelassene Termine ({task.skippedDates.length})</h4>
                    <div className="space-y-2">
                      {task.skippedDates.map((dateStr: string, idx: number) => (
                        <div key={`${dateStr}-${idx}`} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                          <span className="text-sm">
                            {format(new Date(dateStr), "PPP", { locale: de })}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              if (confirm(`Möchten Sie den ausgelassenen Termin vom ${format(new Date(dateStr), "PPP", { locale: de })} wiederherstellen?`)) {
                                restoreSkippedDateMutation.mutate({
                                  taskId: task.id,
                                  householdId: household?.householdId ?? 0,
                                  memberId: member?.memberId ?? 0,
                                  dateToRestore: dateStr,
                                });
                              }
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Wiederherstellen
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Project Task Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    id="isProjectTask"
                    checked={isProjectTask}
                    onCheckedChange={(checked) => setIsProjectTask(checked as boolean)}
                  />
                  <Label htmlFor="isProjectTask" className="cursor-pointer flex items-center gap-2">
                    Aufgabenverknüpfung
                  </Label>
                </div>

                {isProjectTask && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Projekte wählen (Mehrfachauswahl möglich)</Label>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                        {projects.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Keine Projekte verfügbar
                          </p>
                        ) : (
                          projects.map((project: any) => (
                            <div key={project.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-project-${project.id}`}
                                checked={selectedProjectIds.includes(project.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedProjectIds([...selectedProjectIds, project.id]);
                                  } else {
                                    setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`edit-project-${project.id}`}
                                className="cursor-pointer flex-1"
                              >
                                {project.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Prerequisites and Follow-ups */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Aufgabenverknüpfung</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Prerequisites */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Voraussetzungen</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Aufgaben, die vorher erledigt sein müssen
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                            {availableTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-2">Keine Aufgaben verfügbar</p>
                            ) : (
                              availableTasks.map((availableTask: any) => (
                                <div key={availableTask.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                  <Checkbox
                                    id={`prereq-${availableTask.id}`}
                                    checked={prerequisites.includes(availableTask.id)}
                                    onCheckedChange={(checked) => {
                                      setPrerequisites(prev =>
                                        checked
                                          ? [...prev, availableTask.id]
                                          : prev.filter(id => id !== availableTask.id)
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`prereq-${availableTask.id}`} className="cursor-pointer text-sm flex-1">
                                    {availableTask.name}
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Follow-ups */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Folgeaufgaben</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Aufgaben, die danach folgen
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                            {availableTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-2">Keine Aufgaben verfügbar</p>
                            ) : (
                              availableTasks.map((availableTask: any) => (
                                <div key={availableTask.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                  <Checkbox
                                    id={`followup-${availableTask.id}`}
                                    checked={followups.includes(availableTask.id)}
                                    onCheckedChange={(checked) => {
                                      setFollowups(prev =>
                                        checked
                                          ? [...prev, availableTask.id]
                                          : prev.filter(id => id !== availableTask.id)
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`followup-${availableTask.id}`} className="cursor-pointer text-sm flex-1">
                                    {availableTask.name}
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                 )}
              </div>
            </>
          ) : (
            // View Mode with Tabs
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">
                  <HistoryIcon className="h-4 w-4 mr-2" />
                  Verlauf ({taskHistory.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-semibold">{task.name}</h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                  )}
                </div>

                {assignedMemberIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Verantwortlich:</span>{" "}
                      <strong>{assignedMemberNames}</strong>
                    </span>
                  </div>
                )}

                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Fällig:</span>{" "}
                      <strong>
                        {format(new Date(task.dueDate), "PPP 'um' HH:mm 'Uhr'", { locale: de })}
                      </strong>
                    </span>
                  </div>
                )}

                {/* End date display */}
                {task.dueDate && ((task.durationDays && task.durationDays > 0) || (task.durationMinutes && task.durationMinutes > 0)) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Terminende:</span>{" "}
                      <strong>
                        {(() => {
                          const start = new Date(task.dueDate);
                          const daysInMs = (task.durationDays || 0) * 24 * 60 * 60 * 1000;
                          const minutesInMs = (task.durationMinutes || 0) * 60 * 1000;
                          const end = new Date(start.getTime() + daysInMs + minutesInMs);
                          return format(end, "PPP 'um' HH:mm 'Uhr'", { locale: de });
                        })()}
                      </strong>
                    </span>
                  </div>
                )}

                {(task.enableRepeat || task.repeatUnit) && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Wiederholung:</span>{" "}
                      <strong>
                        {task.repeatUnit === "irregular" 
                          ? "Unregelmäßig" 
                          : `Alle ${task.repeatInterval} ${task.repeatUnit === "days" ? "Tage" : task.repeatUnit === "weeks" ? "Wochen" : "Monate"}`}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Kommende Termine */}
                {(task.enableRepeat || task.repeatUnit) && rotationScheduleData && rotationScheduleData.length > 0 && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsUpcomingTermineExpanded(!isUpcomingTermineExpanded)}
                      className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isUpcomingTermineExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Kommende Termine
                      </div>
                    </button>
                    {isUpcomingTermineExpanded && (
                      <UpcomingOccurrencesTable
                      occurrences={rotationSchedule
                        .map((occ: any, index: number) => {
                        const memberNames = occ.members
                          .map((m: any) => members.find(mem => mem.memberId === m.memberId)?.memberName)
                          .filter((name: string | undefined): name is string => name !== undefined && name !== null);
                        
                        // Use specialDate for special occurrences and irregular appointments
                        let calculatedDate: Date | undefined;
                        if (occ.specialDate) {
                          calculatedDate = new Date(occ.specialDate);
                        }
                        // For regular appointments, calculate date if not already set
                        if (!calculatedDate && task.dueDate && task.repeatUnit !== "irregular") {
                          const baseDate = new Date(task.dueDate);
                          const interval = task.repeatInterval || 1;
                          const occNum = occ.occurrenceNumber - 1; // 0-indexed for calculation
                          
                          if (task.repeatUnit === "days") {
                            calculatedDate = new Date(baseDate);
                            calculatedDate.setDate(baseDate.getDate() + (interval * occNum));
                          } else if (task.repeatUnit === "weeks") {
                            calculatedDate = new Date(baseDate);
                            calculatedDate.setDate(baseDate.getDate() + (interval * 7 * occNum));
                          } else if (task.repeatUnit === "months") {
                            if (task.monthlyRecurrenceMode === "same_weekday") {
                              // First occurrence always uses the exact due date
                              if (occNum === 0) {
                                calculatedDate = new Date(baseDate);
                              } else {
                                // Calculate based on user-selected weekday occurrence (e.g., "3rd Monday")
                                const targetMonth = baseDate.getMonth() + (interval * occNum);
                                const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
                                const normalizedMonth = targetMonth % 12;
                                
                                // Use stored monthlyWeekday and monthlyOccurrence values
                                const weekday = task.monthlyWeekday ?? baseDate.getDay();
                                const occurrence = task.monthlyOccurrence ?? Math.ceil(baseDate.getDate() / 7);
                                
                                // Find the Nth occurrence of the weekday in target month
                                calculatedDate = new Date(targetYear, normalizedMonth, 1);
                                let count = 0;
                                
                                while (calculatedDate.getMonth() === normalizedMonth) {
                                  if (calculatedDate.getDay() === weekday) {
                                    count++;
                                    if (count === occurrence) {
                                      break;
                                    }
                                  }
                                  calculatedDate.setDate(calculatedDate.getDate() + 1);
                                }
                                
                                // If we couldn't find the occurrence (e.g., 5th Monday doesn't exist), use last occurrence
                                if (calculatedDate.getMonth() !== normalizedMonth) {
                                  calculatedDate.setDate(calculatedDate.getDate() - 7);
                                }
                              }
                            } else {
                              // Same date mode
                              calculatedDate = new Date(baseDate);
                              calculatedDate.setMonth(baseDate.getMonth() + (interval * occNum));
                            }
                          }
                        }
                        
                        return {
                          occurrenceNumber: occ.occurrenceNumber,
                          date: calculatedDate,
                          time: task.dueDate ? format(new Date(task.dueDate), "HH:mm") : undefined,
                          responsiblePersons: memberNames,
                          notes: occ.notes,
                          isSkipped: occ.isSkipped || false,
                          isSpecial: occ.isSpecial || false,
                          specialName: occ.specialName,
                          _index: index,
                          _hasSpecialFeatures: memberNames.length > 0 || (occ.notes && occ.notes.trim().length > 0) || occ.isSpecial
                        };
                      })
                      .filter((occ: any) => {
                        // Always show first 3 occurrences
                        if (occ._index < 3) return true;
                        // Show occurrences with assigned people or notes
                        return occ._hasSpecialFeatures;
                      })}
                    />
                    )}
                  </div>
                )}

                {task.enableRotation && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Rotation:</span>{" "}
                        <strong>{task.requiredPersons} Person(en) pro Durchgang</strong>
                      </span>
                    </div>
                    

                  </div>
                )}

                {sharedHouseholds.length > 0 && (
                  <div className="space-y-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Geteilt mit {sharedHouseholds.length} Haushalt{sharedHouseholds.length > 1 ? 'en' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sharedHouseholds.map((sh: any) => (
                        <Badge key={sh.id} variant="outline" className="bg-white dark:bg-blue-900">
                          {sh.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                             {task.projectIds && task.projectIds.length > 0 && (
                  <div className="space-y-2">
                    <Badge variant="outline">Projektaufgabe</Badge>
                    <div className="flex flex-wrap gap-2">
                      {task.projectIds.map(projectId => {
                        const project = projects.find(p => p.id === projectId);
                        return project ? (
                          <Button
                            key={projectId}
                            variant="link"
                            className="p-0 h-auto text-sm"
                            onClick={() => {
                              onOpenChange(false);
                              window.location.href = `/projects#project-${projectId}`;
                            }}
                          >
                            → {project.name}
                          </Button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {task.completed && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Erledigt
                    </Badge>
                  </div>
                )}

                {/* Creation Info */}
                {(task.createdBy || task.createdAt) && (
                  <div className="border-t pt-4 mt-4">
                    <div className="text-xs text-muted-foreground space-y-1">
                      {task.createdBy && (
                        <div>
                          Erstellt von: <strong>{ownMembers.find(m => m.id === task.createdBy)?.memberName || members.find(m => m.memberId === task.createdBy)?.memberName || "Unbekannt"}</strong>
                        </div>
                      )}
                      {task.createdAt && (
                        <div>
                          Erstellt am: <strong>{format(new Date(task.createdAt), "PPP 'um' HH:mm 'Uhr'", { locale: de })}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Linked Shopping Items */}
                {linkedShoppingItems.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Verknüpfte Einkaufsliste ({linkedShoppingItems.length})</h4>
                    <div className="space-y-2">
                      {linkedShoppingItems.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedShoppingItem(item);
                            setShowShoppingItemDetail(true);
                          }}
                          className="flex items-center gap-2 text-sm p-2 bg-muted rounded w-full text-left hover:bg-muted/80 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{item.name}</span>
                          {item.details && <span className="text-muted-foreground">• {item.details}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Items Section */}
                {task && rotationSchedule.length > 0 && (
                  <RequiredItemsSection
                    taskId={task.id}
                    householdId={task.householdId}
                    taskName={task.name}
                    members={members}
                    rotationSchedule={rotationSchedule}
                    onItemAdded={() => {
                      // Invalidate queries to reload items
                      utils.taskOccurrenceItems.getTaskOccurrenceItems.invalidate({ taskId: task.id });
                    }}
                  />
                )}
                
                {/* Dependencies */}
                {taskDependencies && (taskDependencies.prerequisites.length > 0 || taskDependencies.followups.length > 0) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Aufgabenverknüpfungen</h4>
                    
                    {taskDependencies.prerequisites.length > 0 && (
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground">Voraussetzungen</Label>
                        <div className="space-y-1 mt-1">
                          {taskDependencies.prerequisites.map((prereq: any) => (
                            <Button
                              key={prereq.id}
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-xs justify-start w-full"
                              onClick={() => {
                                if (onNavigateToTask) {
                                  onNavigateToTask(prereq.id);
                                }
                              }}
                            >
                              → {prereq.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {taskDependencies.followups.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Folgeaufgaben</Label>
                        <div className="space-y-1 mt-1">
                          {taskDependencies.followups.map((followup: any) => (
                            <Button
                              key={followup.id}
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-xs justify-start w-full"
                              onClick={() => {
                                if (onNavigateToTask) {
                                  onNavigateToTask(followup.id);
                                }
                              }}
                            >
                              → {followup.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Aktionen</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {task.isCompleted || task.completed ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            if (!household || !member) return;
                            restoreTask.mutate({
                              taskId: task.id,
                              householdId: household.householdId,
                              memberId: member.memberId,
                              isCompleted: false,
                            });
                          }}
                          disabled={restoreTask.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Wiederherstellen
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => setShowCompleteDialog(true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Abschließen
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowMilestoneDialog(true)}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Zwischenziel
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full col-span-2"
                            onClick={() => setShowReminderDialog(true)}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Erinnerung senden
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4 mt-4">
                {taskHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Noch keine Aktivitäten für diese Aufgabe</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskHistory.map((activity: any) => {
                      const activityMember = ownMembers.find(m => m.id === activity.memberId) || members.find(m => m.memberId === activity.memberId);
                      return (
                        <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {activity.action}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(activity.createdAt), "PPP 'um' HH:mm 'Uhr'", { locale: de })}
                                </span>
                              </div>
                              <p className="text-sm">{activity.description}</p>
                              {activity.comment && (
                                <p className="text-sm text-muted-foreground mt-2 italic">"{activity.comment}"</p>
                              )}
                              {activityMember && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  von {activityMember.memberName}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {activity.photoUrls && activity.photoUrls.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mt-3">
                              {activity.photoUrls.map((photo: {url: string, filename: string}, idx: number) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                  <img
                                    src={photo.url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                      setViewerPhotos(activity.photoUrls);
                                      setViewerPhotoIndex(idx);
                                      setShowPhotoViewer(true);
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {activity.fileUrls && activity.fileUrls.length > 0 && (
                            <div className="space-y-2 mt-3">
                              {activity.fileUrls.map((file: {url: string, filename: string}, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setViewerPDF(file);
                                    setShowPDFViewer(true);
                                  }}
                                  className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary hover:bg-accent/5 transition-colors w-full text-left"
                                >
                                  <FileText className="h-5 w-5 text-red-600 shrink-0" />
                                  <span className="text-sm truncate">{file.filename}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={!name || updateTask.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Action Dialogs */}
    {task && household && member && (
      <>
        <CompleteTaskDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          task={{
            id: task.id,
            name: task.name,
            description: task.description || undefined,
          }}
          taskId={task.id}
          linkedShoppingItems={linkedShoppingItems}
          onComplete={async (data) => {
            if (!household || !member) return;
            await utils.client.tasks.completeTask.mutate({
              taskId: task.id,
              householdId: household.householdId,
              memberId: member.memberId,
              comment: data.comment,
              photoUrls: data.photoUrls,
              fileUrls: data.fileUrls,
              shoppingItemsToInventory: data.shoppingItemsToInventory,
            });
            setShowCompleteDialog(false);
            setActiveTab("history");
            utils.tasks.list.invalidate();
            utils.activities.getByTaskId.invalidate();
            if (onTaskUpdated) {
              onTaskUpdated({ ...task, isCompleted: true, completed: true });
            }
            toast.success("Aufgabe abgeschlossen");
          }}
        />
        
        <MilestoneDialog
          open={showMilestoneDialog}
          onOpenChange={setShowMilestoneDialog}
          task={{
            id: task.id,
            name: task.name,
            description: task.description || undefined,
          }}
          onAddMilestone={async (data) => {
            if (!household || !member) return;
            await utils.client.tasks.addMilestone.mutate({
              taskId: task.id,
              householdId: household.householdId,
              memberId: member.memberId,
              comment: data.comment,
              photoUrls: data.photoUrls,
              fileUrls: data.fileUrls,
            });
            setShowMilestoneDialog(false);
            setActiveTab("history");
            utils.activities.getByTaskId.invalidate();
            toast.success("Zwischenziel dokumentiert");
          }}
        />
        
        <ReminderDialog
          open={showReminderDialog}
          onOpenChange={setShowReminderDialog}
          task={{
            id: task.id,
            name: task.name,
            description: task.description || undefined,
            assignedTo: task.assignedTo?.toString(),
          }}
          onSendReminder={async (data) => {
            if (!household || !member) return;
            await utils.client.tasks.sendReminder.mutate({
              taskId: task.id,
              householdId: household.householdId,
              memberId: member.memberId,
              comment: data.comment,
            });
            setShowReminderDialog(false);
            setActiveTab("history");
            utils.activities.getByTaskId.invalidate();
            toast.success("Erinnerung gesendet");
          }}
        />
      </>
    )}
    
    {/* Shopping Item Detail Dialog */}
    {showShoppingItemDetail && selectedShoppingItem && (
      <Dialog open={showShoppingItemDetail} onOpenChange={setShowShoppingItemDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel-Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedShoppingItem.name}</h3>
            </div>
            
            {selectedShoppingItem.details && (
              <div>
                <Label className="text-muted-foreground">Details</Label>
                <p className="text-sm">{selectedShoppingItem.details}</p>
              </div>
            )}
            
            {selectedShoppingItem.photoUrls && selectedShoppingItem.photoUrls.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Fotos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(() => {
                    const normalizePhotoUrls = (photoUrls: any): Array<{ url: string; filename: string }> => {
                      if (!photoUrls || !Array.isArray(photoUrls)) return [];
                      return photoUrls.map((item: any) => {
                        if (typeof item === 'object' && item.url && item.filename) {
                          return item;
                        }
                        if (typeof item === 'string') {
                          const filename = item.split('/').pop() || 'unknown.jpg';
                          return { url: item, filename };
                        }
                        return { url: String(item), filename: 'unknown.jpg' };
                      });
                    };
                    return normalizePhotoUrls(selectedShoppingItem.photoUrls).map((photo, index) => (
                      <img 
                        key={index} 
                        src={photo.url} 
                        alt={photo.filename} 
                        className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShoppingItemDetail(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    
    {/* Photo Viewer */}
    <PhotoViewer
      photos={viewerPhotos}
      initialIndex={viewerPhotoIndex}
      open={showPhotoViewer}
      onOpenChange={setShowPhotoViewer}
    />
    
    {/* PDF Viewer */}
    {viewerPDF && (
      <PDFViewer
        url={viewerPDF.url}
        filename={viewerPDF.filename}
        open={showPDFViewer}
        onOpenChange={setShowPDFViewer}
      />
    )}
  </>
  );
}

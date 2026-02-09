import { useState, useEffect } from "react";
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
import { Calendar, User, Repeat, Users, Edit, X, Check, History as HistoryIcon, ImageIcon, CheckCircle2, Target, Bell, RotateCcw, FileText } from "lucide-react";
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

interface Task {
  id: number;
  name: string;
  description?: string | null;
  assignedTo?: number | null;
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
}

export function TaskDetailDialog({ task, open, onOpenChange, members, onTaskUpdated, onNavigateToTask }: TaskDetailDialogProps) {
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
  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [customFrequencyDays, setCustomFrequencyDays] = useState(1);
  const [enableRepeat, setEnableRepeat] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [enableRotation, setEnableRotation] = useState(false);
  const [requiredPersons, setRequiredPersons] = useState(1);
  const [excludedMembers, setExcludedMembers] = useState<number[]>([]);

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
      setAssignedTo(task.assignedTo || null);
      setSelectedAssignees(task.assignedTo ? [task.assignedTo] : []);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        setDueDate(format(date, "yyyy-MM-dd"));
        setDueTime(format(date, "HH:mm"));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Map task data to repeat fields
      const hasRepeat = Boolean(task.enableRepeat) || (task.frequency && task.frequency !== "once");
      setEnableRepeat(Boolean(hasRepeat));
      
      if (hasRepeat) {
        // Use new frequency field if available, otherwise map old repeat fields
        if (task.frequency) {
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
          setRepeatUnit(task.repeatUnit as "days" | "weeks" | "months");
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
      
      // Initialize sharing state from sharedHouseholds query (loaded separately)
      // This will be set in a separate useEffect when sharedHouseholds loads
    }
  }, [task, open]);
  
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
  
  // Load existing shared households when sharedHouseholds are fetched
  useEffect(() => {
    if (sharedHouseholds && task && open) {
      const householdIds = sharedHouseholds.map((sh: any) => sh.id);
      setEnableSharing(householdIds.length > 0);
      setSelectedSharedHouseholds(householdIds);
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
    
    if (enableRepeat) {
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
        assignedTo: selectedAssignees[0] || undefined,
        dueDate: dueDateString || undefined,
        dueTime: dueTimeString || undefined,
        frequency: frequency,
        customFrequencyDays: customFrequencyDays,
        repeatInterval: enableRepeat ? parseInt(repeatInterval) : undefined,
        repeatUnit: enableRepeat ? repeatUnit : undefined,
        enableRotation: enableRepeat && enableRotation,
        requiredPersons: enableRepeat && enableRotation ? requiredPersons : undefined,
        excludedMembers: enableRepeat && enableRotation ? excludedMembers : undefined,
        projectIds: isProjectTask ? selectedProjectIds : [],
        sharedHouseholdIds: enableSharing ? selectedSharedHouseholds : [],
      });
      
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
      await utils.projects.getTaskDependencies.invalidate({ taskId: task.id });
      await utils.projects.getDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
      await utils.projects.getAllDependencies.invalidate({ householdId: household.householdId });
      
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
      setAssignedTo(task.assignedTo || null);
      setSelectedAssignees(task.assignedTo ? [task.assignedTo] : []);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        setDueDate(format(date, "yyyy-MM-dd"));
        setDueTime(format(date, "HH:mm"));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Map task data to repeat fields
      const hasRepeat = Boolean(task.enableRepeat) || (task.frequency && task.frequency !== "once");
      setEnableRepeat(Boolean(hasRepeat));
      
      if (hasRepeat) {
        // Use new frequency field if available, otherwise map old repeat fields
        if (task.frequency) {
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
          setRepeatUnit(task.repeatUnit as "days" | "weeks" | "months");
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

  const assignedMember = members.find(m => m.memberId === task.assignedTo);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditing ? "Aufgabe bearbeiten" : "Aufgabendetails"}</span>
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
                  {members.map((m) => (
                    <div key={m.memberId} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`edit-assignee-${m.memberId}`}
                        checked={selectedAssignees.includes(m.memberId)}
                        onCheckedChange={() => toggleAssignee(m.memberId)}
                      />
                      <Label htmlFor={`edit-assignee-${m.memberId}`} className="cursor-pointer flex-1">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Connected household members (only if sharing enabled and households selected) */}
                  {enableSharing && selectedSharedHouseholds.length > 0 && connectedMembers
                    .filter((cm: any) => {
                      // Filter out duplicates: if member exists in own household (same userId), don't show from connected
                      return !members.some((m: any) => m.userId && cm.userId && m.userId === cm.userId);
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

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                  <Switch
                    id="enableRepeat"
                    checked={enableRepeat}
                    onCheckedChange={(checked) => setEnableRepeat(checked)}
                  />
                  <Label htmlFor="enableRepeat" className="cursor-pointer flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Wiederholung aktivieren
                  </Label>
                </div>

                {enableRepeat && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
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

                    {/* Rotation checkbox - nested under repeat */}
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                      <Switch
                        id="enableRotation"
                        checked={enableRotation}
                        onCheckedChange={(checked) => setEnableRotation(checked)}
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
                            {members.map((m) => (
                              <div key={m.memberId} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`exclude-${m.memberId}`}
                                  checked={excludedMembers.includes(m.memberId)}
                                  onCheckedChange={(checked) => {
                                    setExcludedMembers(prev =>
                                      checked
                                        ? [...prev, m.memberId]
                                        : prev.filter(id => id !== m.memberId)
                                    );
                                  }}
                                />
                                <Label htmlFor={`exclude-${m.memberId}`} className="cursor-pointer text-sm flex-1">
                                  {m.memberName}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Skipped Dates */}
                {task.repeatInterval && task.repeatUnit && task.skippedDates && task.skippedDates.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3">Ausgelassene Termine ({task.skippedDates.length})</h4>
                    <div className="space-y-2">
                      {task.skippedDates.map((dateStr: string) => (
                        <div key={dateStr} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
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

                {assignedMember && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Verantwortlich:</span>{" "}
                      <strong>{assignedMember.memberName}</strong>
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

                {task.enableRepeat && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Wiederholung:</span>{" "}
                      <strong>
                        Alle {task.repeatInterval} {task.repeatUnit === "days" ? "Tage" : task.repeatUnit === "weeks" ? "Wochen" : "Monate"}
                      </strong>
                    </span>
                  </div>
                )}

                {task.enableRotation && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Rotation:</span>{" "}
                      <strong>{task.requiredPersons} Person(en) pro Durchgang</strong>
                    </span>
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
                          Erstellt von: <strong>{members.find(m => m.memberId === task.createdBy)?.memberName || "Unbekannt"}</strong>
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

                {/* Next 4 Occurrences for Recurring Tasks */}
                {(task.enableRepeat || task.frequency !== "once") && task.dueDate && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-2">Kommende Termine</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {(() => {
                        const dates: Date[] = [];
                        const baseDate = new Date(task.dueDate);
                        let interval = task.repeatInterval || task.customFrequencyDays || 1;
                        let unit = task.repeatUnit || (task.frequency === "daily" ? "days" : task.frequency === "weekly" ? "weeks" : task.frequency === "monthly" ? "months" : "days");
                        
                        // Map frequency to interval/unit if not using old repeat fields
                        if (task.frequency === "daily") { interval = 1; unit = "days"; }
                        else if (task.frequency === "weekly") { interval = 1; unit = "weeks"; }
                        else if (task.frequency === "monthly") { interval = 1; unit = "months"; }
                        else if (task.frequency === "custom" && task.customFrequencyDays) { interval = task.customFrequencyDays; unit = "days"; }
                        
                        for (let i = 1; i <= 4; i++) {
                          const nextDate = new Date(baseDate);
                          if (unit === "days") {
                            nextDate.setDate(baseDate.getDate() + (interval * i));
                          } else if (unit === "weeks") {
                            nextDate.setDate(baseDate.getDate() + (interval * i * 7));
                          } else if (unit === "months") {
                            nextDate.setMonth(baseDate.getMonth() + (interval * i));
                          }
                          dates.push(nextDate);
                        }
                        
                        return dates.map((date, idx) => (
                          <div key={idx}>
                            {format(date, "PPP 'um' HH:mm 'Uhr'", { locale: de })}
                          </div>
                        ));
                      })()}
                    </div>
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
                      const activityMember = members.find(m => m.memberId === activity.memberId);
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
                                    onClick={() => window.open(photo.url, '_blank')}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {activity.fileUrls && activity.fileUrls.length > 0 && (
                            <div className="space-y-2 mt-3">
                              {activity.fileUrls.map((file: {url: string, filename: string}, idx: number) => (
                                <a
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary hover:bg-accent/5 transition-colors"
                                >
                                  <FileText className="h-5 w-5 text-red-600 shrink-0" />
                                  <span className="text-sm truncate">{file.filename}</span>
                                </a>
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
  </>
  );
}

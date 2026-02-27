import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Target, Bell, Calendar, AlertCircle, RefreshCw, User, ChevronDown, Users } from "lucide-react";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { BottomNav } from "@/components/BottomNav";

import { Alert, AlertDescription } from "@/components/ui/alert";
import TaskDependencies from "@/components/TaskDependencies";

export default function Tasks() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useCompatAuth();
  
  // Get URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const taskIdFromUrl = urlParams.get('taskId');
  
  // Form state
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [durationTime, setDurationTime] = useState("00:00"); // HH:MM format
  const [durationDays, setDurationDays] = useState("0");
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  
  // Repeat options
  const [enableRepeat, setEnableRepeat] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months">("weeks");
  
  // Rotation options
  const [enableRotation, setEnableRotation] = useState(false);
  const [requiredPersons, setRequiredPersons] = useState("1");
  const [excludedMembers, setExcludedMembers] = useState<number[]>([]);
  
  // Project options
  const [isProjectTask, setIsProjectTask] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [prerequisites, setPrerequisites] = useState<number[]>([]);
  const [followups, setFollowups] = useState<number[]>([]);

  // Sharing with neighbors states
  const [shareWithNeighbors, setShareWithNeighbors] = useState(false);
  const [sharedHouseholdIds, setSharedHouseholdIds] = useState<number[]>([]);
  const [nonResponsiblePermission, setNonResponsiblePermission] = useState<"full" | "milestones_reminders" | "view_only">("full");

  // Dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Batch selection states
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [showBatchAssignDialog, setShowBatchAssignDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [batchAssignTo, setBatchAssignTo] = useState<number | null>(null); // Single member for batch assign
  
  // Filter and sorting states
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "completed">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | "all">("all");
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "overdue" | "today" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "name" | "createdAt">("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };
  
  const selectAllTasks = () => {
    const incompleteTasks = tasks.filter(t => !t.isCompleted);
    setSelectedTaskIds(incompleteTasks.map(t => t.id));
  };
  
  const deselectAllTasks = () => {
    setSelectedTaskIds([]);
  };
  
  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedTaskIds([]);
  };


  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );
  
  // Open task detail dialog if taskId is in URL
  useEffect(() => {
    if (taskIdFromUrl && tasks.length > 0 && !isLoading) {
      const task = tasks.find(t => t.id === parseInt(taskIdFromUrl));
      if (task) {
        setSelectedTask(task);
        setDetailDialogOpen(true);
        // Clear URL parameter after opening
        window.history.replaceState({}, '', '/tasks');
      }
    }
  }, [taskIdFromUrl, tasks, isLoading]);

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: projects = [] } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: connectedHouseholds = [] } = trpc.neighborhood.getConnectedHouseholds.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: connectedMembers = [] } = trpc.neighborhood.getConnectedMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && shareWithNeighbors && sharedHouseholdIds.length > 0 }
  );

  const { data: availableTasks = [] } = trpc.projects.getAvailableTasks.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Load all dependencies once for all tasks
  const { data: dependencies = [] } = trpc.projects.getAllDependencies.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const createProjectMutation = trpc.projects.create.useMutation();
  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();
  const updateBidirectionalDependenciesMutation = trpc.projects.updateBidirectionalDependencies.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.projects.getAllDependencies.invalidate();
      toast.success("Bidirektionale Verknüpfungen erstellt");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const addMutation = trpc.tasks.add.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.shopping.list.invalidate();
      toast.success("Aufgabe gelöscht");
    },
  });
  
  // Batch mutations
  const batchDeleteMutation = trpc.tasks.batchDelete.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      toast.success(`${data.deletedCount} Aufgabe(n) gelöscht`);
      exitBatchMode();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
  
  const batchAssignMutation = trpc.tasks.batchAssign.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      toast.success(`${data.updatedCount} Aufgabe(n) zugewiesen`);
      exitBatchMode();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
  
  const batchCompleteMutation = trpc.tasks.batchComplete.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      toast.success(`${data.completedCount} Aufgabe(n) abgeschlossen`);
      exitBatchMode();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const completeTaskMutation = trpc.tasks.completeTask.useMutation({
    onSuccess: (result) => {
      utils.tasks.list.invalidate();
      if (result.isRecurring) {
        toast.success("Termin abgeschlossen – nächster Termin eingestellt");
      } else {
        toast.success("Aufgabe abgeschlossen!");
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const milestoneMutation = trpc.tasks.addMilestone.useMutation({
    onSuccess: () => {
      toast.success("Zwischensieg gespeichert!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const reminderMutation = trpc.tasks.sendReminder.useMutation({
    onSuccess: () => {
      toast.success("Erinnerung gesendet!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Calculate available members for rotation
  const availableMembers = members.filter(m => !excludedMembers.includes(m.id));
  const availableCount = availableMembers.length;
  const requiredCount = parseInt(requiredPersons) || 0;
  
  // Validation error
  const rotationError = enableRotation && enableRepeat && requiredCount > 0 && availableCount < requiredCount
    ? `Nicht genügend verfügbare Mitglieder! Benötigt: ${requiredCount}, Verfügbar: ${availableCount}`
    : null;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !member) {
      toast.error("Haushaltsdaten nicht verfügbar");
      return;
    }
    if (!newTaskName.trim()) {
      toast.error("Bitte geben Sie einen Aufgabennamen ein");
      return;
    }

    if (rotationError) {
      toast.error(rotationError);
      return;
    }

    if (selectedAssignees.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Verantwortlichen");
      return;
    }

    // Determine frequency based on repeat settings
    let frequency: "once" | "daily" | "weekly" | "monthly" | "custom" = "once";
    if (enableRepeat) {
      const interval = parseInt(repeatInterval) || 1;
      if (repeatUnit === "days" && interval === 1) frequency = "daily";
      else if (repeatUnit === "weeks" && interval === 1) frequency = "weekly";
      else if (repeatUnit === "months" && interval === 1) frequency = "monthly";
      else frequency = "custom";
    }

    try {
      let finalProjectIds = [...selectedProjectIds];

      // Create new project if requested
      if (isProjectTask && createNewProject) {
        const projectName = newProjectName.trim() || newTaskName.trim();
        const projectResult = await createProjectMutation.mutateAsync({
          householdId: household.householdId,
          memberId: member.memberId,
          name: projectName,
          description: newProjectDescription.trim() || undefined,
          endDate: dueDate || undefined,
          isNeighborhoodProject: false,
        });
        finalProjectIds = [projectResult.projectId];
      }

      // Create task
      const taskResult = await addMutation.mutateAsync({
        householdId: household.householdId,
        memberId: member.memberId,
        name: newTaskName.trim(),
        description: newTaskDescription.trim() || undefined,
        frequency,
        repeatInterval: enableRepeat ? parseInt(repeatInterval) || undefined : undefined,
        repeatUnit: enableRepeat ? repeatUnit : undefined,
        enableRotation: enableRepeat && enableRotation,
        requiredPersons: enableRepeat && enableRotation ? parseInt(requiredPersons) || undefined : undefined,
        excludedMembers: enableRepeat && enableRotation ? excludedMembers : undefined,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        durationDays: parseInt(durationDays) || 0,
        durationMinutes: (() => {
          const [hours, minutes] = durationTime.split(':').map(Number);
          return (hours || 0) * 60 + (minutes || 0);
        })(),
        assignedTo: selectedAssignees.length > 0 ? selectedAssignees : undefined, // Array of assignees
        projectIds: isProjectTask && finalProjectIds.length > 0 ? finalProjectIds : undefined,
        sharedHouseholdIds: shareWithNeighbors ? sharedHouseholdIds : [],
        nonResponsiblePermission: shareWithNeighbors && sharedHouseholdIds.length > 0 ? nonResponsiblePermission : "full",
      });

      // Add dependencies if this is a project task
      if (isProjectTask && (prerequisites.length > 0 || followups.length > 0)) {
        await addDependenciesMutation.mutateAsync({
          taskId: taskResult.id,
          householdId: household!.householdId,
          prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
          followups: followups.length > 0 ? followups : undefined,
        });

        // Prepare dependency links for confirmation dialog
        const dependencyLinks = [
          ...prerequisites.map((taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            return {
              taskId,
              taskName: task?.name || `Aufgabe ${taskId}`,
              type: "prerequisite" as const,
            };
          }),
          ...followups.map((taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            return {
              taskId,
              taskName: task?.name || `Aufgabe ${taskId}`,
              type: "followup" as const,
            };
          }),
        ];

        // Dependencies are already created
      }
      
      // Now invalidate and refetch all queries
      await utils.tasks.list.invalidate();
      await utils.projects.list.invalidate();
      await utils.projects.getAvailableTasks.invalidate();
      await utils.projects.getTaskDependencies.invalidate();
      await utils.projects.getAllDependencies.invalidate();
      
      // Refetch to ensure UI updates immediately
      const refreshedTasks = await utils.tasks.list.fetch({ householdId: household!.householdId });
      await utils.projects.getAllDependencies.fetch({ householdId: household!.householdId });
      
      // Reset form
      setNewTaskName("");
      setNewTaskDescription("");
      setDueDate("");
      setDueTime("");
      setSelectedAssignees([]);
      setEnableRepeat(false);
      setRepeatInterval("1");
      setRepeatUnit("weeks");
      setEnableRotation(false);
      setRequiredPersons("1");
      setExcludedMembers([]);
      setIsProjectTask(false);
      setSelectedProjectIds([]);
      setCreateNewProject(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setPrerequisites([]);
      setFollowups([]);
      
      // Find and open detail dialog for new task
      const newTask = refreshedTasks.find(t => t.id === taskResult.id);
      if (newTask) {
        // Prefetch dependencies for the new task before opening dialog
        if (newTask.projectIds && newTask.projectIds.length > 0) {
          await utils.projects.getTaskDependencies.fetch({ taskId: newTask.id });
        }
        setSelectedTask(newTask);
        setDetailDialogOpen(true);
      } else {
        toast.success("Aufgabe hinzugefügt");
      }
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen der Aufgabe");
    }
  };

  const handleDelete = (taskId: number) => {
    if (!household || !member) return;
    if (confirm("Möchten Sie diese Aufgabe wirklich löschen?")) {
      deleteMutation.mutate({
        taskId,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const handleCompleteTask = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!selectedTask || !household || !member) return;
    await completeTaskMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const handleAddMilestone = async (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => {
    if (!selectedTask || !household || !member) return;
    await milestoneMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
      fileUrls: data.fileUrls,
    });
  };

  const handleSendReminder = async (data: { comment?: string }) => {
    if (!selectedTask || !household || !member) return;
    await reminderMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
    });
  };

  const toggleAssignee = (memberId: number) => {
    setSelectedAssignees(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleExcludedMember = (memberId: number) => {
    setExcludedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

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
  
  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    let filtered = [...tasks];
    
    // Status filter
    if (statusFilter === "open") {
      filtered = filtered.filter(t => !t.isCompleted);
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(t => t.isCompleted);
    }
    
    // Assignee filter
    if (assigneeFilter !== "all") {
      filtered = filtered.filter(t => {
        const ids = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
        return ids.includes(assigneeFilter);
      });
    }
    
    // Due date filter
    if (dueDateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        
        if (dueDateFilter === "overdue") {
          return dueDate < today && !t.isCompleted;
        } else if (dueDateFilter === "today") {
          return dueDate.toDateString() === today.toDateString();
        } else if (dueDateFilter === "week") {
          return dueDate >= today && dueDate <= weekFromNow;
        } else if (dueDateFilter === "month") {
          return dueDate >= today && dueDate <= monthFromNow;
        }
        return true;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "dueDate") {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        comparison = aDate - bDate;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "createdAt") {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = aDate - bDate;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [tasks, statusFilter, assigneeFilter, dueDateFilter, sortBy, sortDirection]);
  
  const resetFilters = () => {
    setStatusFilter("all");
    setAssigneeFilter("all");
    setDueDateFilter("all");
    setSortBy("dueDate");
    setSortDirection("asc");
  };

  // Loading state if household or member not available
  if (!household || !member) {
    return (
      <AppLayout>
        <div className="container py-6 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Lade Haushaltsdaten...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl pb-24">
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
            <h1 className="text-3xl font-bold">Haushaltsaufgaben</h1>
            <p className="text-muted-foreground">{household.householdName}</p>
          </div>
        </div>

        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Neue Aufgabe erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTask} className="space-y-4">
              {/* Task name */}
              <div className="space-y-2">
                <Label htmlFor="taskName">Aufgabenname *</Label>
                <Input
                  id="taskName"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="z.B. Müll rausbringen"
                  required
                />
              </div>

              {/* Show remaining fields only after name is entered */}
              {newTaskName.trim() && (
                <>
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Beschreibung</Label>
                <Textarea
                  id="taskDescription"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Optionale Details zur Aufgabe"
                  rows={2}
                />
              </div>

              {/* Date and time picker */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Termin (Datum)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueTime">Uhrzeit</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="durationTime">Dauer (Stunden:Minuten)</Label>
                  <Input
                    id="durationTime"
                    type="time"
                    value={durationTime}
                    onChange={(e) => setDurationTime(e.target.value)}
                    placeholder="00:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationDays">Dauer (Tage)</Label>
                  <Input
                    id="durationDays"
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
                      const end = new Date(start);
                      end.setDate(end.getDate() + (parseInt(durationDays) || 0));
                      const [hours, minutes] = durationTime.split(':').map(Number);
                      end.setMinutes(end.getMinutes() + (hours || 0) * 60 + (minutes || 0));
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

              {/* Multiple assignees */}
              <div className="space-y-2">
                <Label>Verantwortliche für ersten Termin *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`assignee-${m.id}`}
                        checked={selectedAssignees.includes(m.id)}
                        onCheckedChange={() => toggleAssignee(m.id)}
                      />
                      <Label htmlFor={`assignee-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Connected household members (only when sharing is enabled AND households selected) */}
                  {shareWithNeighbors && sharedHouseholdIds.length > 0 && connectedMembers
                    .filter((cm: any) => {
                      // Filter out duplicates: if member exists in own household (same userId), don't show from connected
                      return !members.some((m: any) => {
                        // If both have userId and they match, it's a duplicate
                        if (m.userId && cm.userId && m.userId === cm.userId) {
                          return true;
                        }
                        // If both have NULL userId, check name to avoid duplicates
                        if (!m.userId && !cm.userId && m.memberName === cm.memberName) {
                          return true;
                        }
                        return false;
                      });
                    })
                    .map((m: any) => (
                    <div key={`connected-${m.id}`} className="flex items-center space-x-2 p-2 rounded-lg border bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                      <Checkbox
                        id={`task-assignee-connected-${m.id}`}
                        checked={selectedAssignees.includes(m.id)}
                        onCheckedChange={() => toggleAssignee(m.id)}
                      />
                      <Label htmlFor={`task-assignee-connected-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName} <span className="text-xs text-muted-foreground">({m.householdName})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share with neighbors */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shareWithNeighbors"
                    checked={shareWithNeighbors}
                    onCheckedChange={(checked) => {
                      setShareWithNeighbors(checked as boolean);
                      if (!checked) setSharedHouseholdIds([]);
                    }}
                  />
                  <Label htmlFor="shareWithNeighbors" className="cursor-pointer font-medium">
                    Mit Nachbarn teilen
                  </Label>
                </div>
                {shareWithNeighbors && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-sm text-muted-foreground">Haushalte auswählen:</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {connectedHouseholds.map((household: any) => (
                        <div key={household.id} className="flex items-center space-x-2 p-2 rounded border bg-background">
                          <Checkbox
                            id={`household-${household.id}`}
                            checked={sharedHouseholdIds.includes(household.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSharedHouseholdIds([...sharedHouseholdIds, household.id]);
                              } else {
                                setSharedHouseholdIds(sharedHouseholdIds.filter(id => id !== household.id));
                              }
                            }}
                          />
                          <Label htmlFor={`household-${household.id}`} className="cursor-pointer flex-1">
                            {household.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {/* Permission selector for shared tasks */}
                    {sharedHouseholdIds.length > 0 && (
                      <div className="mt-3">
                        <Label className="text-sm text-muted-foreground mb-2 block">Berechtigungen für nicht-verantwortliche Mitglieder:</Label>
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Repeat checkbox */}
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="enableRepeat"
                  checked={enableRepeat}
                  onCheckedChange={(checked) => setEnableRepeat(checked as boolean)}
                />
                <Label htmlFor="enableRepeat" className="cursor-pointer flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Wiederholung aktivieren
                </Label>
              </div>

              {/* Repeat options (collapsible) */}
              {enableRepeat && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  {/* Repeat interval */}
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

                  {/* Rotation checkbox */}
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                    <Checkbox
                      id="enableRotation"
                      checked={enableRotation}
                      onCheckedChange={(checked) => setEnableRotation(checked as boolean)}
                    />
                    <Label htmlFor="enableRotation" className="cursor-pointer">
                      Verantwortung rotieren
                    </Label>
                  </div>

                  {/* Rotation options (collapsible) */}
                  {enableRotation && (
                    <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                      {/* Required persons */}
                      <div className="space-y-2">
                        <Label htmlFor="requiredPersons">Regulär benötigte Personen *</Label>
                        <Input
                          id="requiredPersons"
                          type="number"
                          min="1"
                          value={requiredPersons}
                          onChange={(e) => setRequiredPersons(e.target.value)}
                          className="w-32"
                        />
                      </div>

                      {/* Excluded members */}
                      <div className="space-y-2">
                        <Label>Von Rotation freistellen</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {members.map((m) => (
                            <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                              <Checkbox
                                id={`exclude-${m.id}`}
                                checked={excludedMembers.includes(m.id)}
                                onCheckedChange={() => toggleExcludedMember(m.id)}
                              />
                              <Label htmlFor={`exclude-${m.id}`} className="cursor-pointer flex-1">
                                {m.memberName}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Validation error */}
                      {rotationError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{rotationError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Project task checkbox */}
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="isProjectTask"
                  checked={isProjectTask}
                  onCheckedChange={(checked) => setIsProjectTask(checked as boolean)}
                />
                <Label htmlFor="isProjectTask" className="cursor-pointer flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Aufgabenverknüpfung
                </Label>
              </div>

              {/* Project options (collapsible) */}
              {isProjectTask && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  {/* Project assignment section */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Projektzuordnung</Label>
                    
                    {/* Multi-select existing projects */}
                    <div className="space-y-2">
                      <Label className="text-sm">Bestehende Projekte wählen</Label>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                        {projects.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Keine Projekte verfügbar
                          </p>
                        ) : (
                          projects.map((project) => (
                            <div key={project.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`project-${project.id}`}
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
                                htmlFor={`project-${project.id}`}
                                className="cursor-pointer flex-1"
                              >
                                {project.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Create new project inline */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="createNewProject"
                          checked={createNewProject}
                          onCheckedChange={(checked) => setCreateNewProject(checked as boolean)}
                        />
                        <Label htmlFor="createNewProject" className="cursor-pointer text-sm font-medium">
                          Neues Projekt erstellen
                        </Label>
                      </div>
                      {createNewProject && (
                        <div className="space-y-3 pl-6">
                          <div className="space-y-2">
                            <Label htmlFor="newProjectName" className="text-sm">Projektname *</Label>
                            <Input
                              id="newProjectName"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              placeholder="Name wird von Aufgabe übernommen"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newProjectDescription" className="text-sm">Projektbeschreibung</Label>
                            <Textarea
                              id="newProjectDescription"
                              value={newProjectDescription}
                              onChange={(e) => setNewProjectDescription(e.target.value)}
                              placeholder="Optionale Projektbeschreibung"
                              rows={2}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Das neue Projekt wird automatisch ausgewählt. Zieltermin und Verantwortliche werden von der Aufgabe übernommen.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task dependencies section */}
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
                            availableTasks.map((task) => (
                              <div key={`prereq-${task.id}`} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`prereq-${task.id}`}
                                  checked={prerequisites.includes(task.id)}
                                  onCheckedChange={(checked) => {
                                    setPrerequisites(prev =>
                                      checked
                                        ? [...prev, task.id]
                                        : prev.filter(id => id !== task.id)
                                    );
                                  }}
                                />
                                <Label htmlFor={`prereq-${task.id}`} className="cursor-pointer text-sm flex-1">
                                  {task.name}
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
                          Aufgaben, die danach folgen sollen
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                          {availableTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2">Keine Aufgaben verfügbar</p>
                          ) : (
                            availableTasks.map((task) => (
                              <div key={`followup-${task.id}`} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`followup-${task.id}`}
                                  checked={followups.includes(task.id)}
                                  onCheckedChange={(checked) => {
                                    setFollowups(prev =>
                                      checked
                                        ? [...prev, task.id]
                                        : prev.filter(id => id !== task.id)
                                    );
                                  }}
                                />
                                <Label htmlFor={`followup-${task.id}`} className="cursor-pointer text-sm flex-1">
                                  {task.name}
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

              {newTaskName.trim() && (
                <Button type="submit" className="w-full" disabled={addMutation.isPending || !!rotationError}>
                  <Plus className="mr-2 h-4 w-4" />
                  {addMutation.isPending ? "Wird erstellt..." : "Aufgabe erstellen"}
                </Button>
              )}
              </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Filter and Sort Controls */}
        {!isLoading && tasks.length > 0 && (
          <Card className="shadow-sm mb-3">
            <Collapsible open={filterExpanded} onOpenChange={setFilterExpanded}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
                        <h3 className="text-sm font-medium">Filter & Sortierung</h3>
                        <ChevronDown className={`h-4 w-4 transition-transform ${filterExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    {filterExpanded && (
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Zurücksetzen
                      </Button>
                    )}
                  </div>
                  
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  {/* Status Filter */}
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="open">Offen</SelectItem>
                        <SelectItem value="completed">Erledigt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Assignee Filter */}
                  <div>
                    <Label className="text-xs">Verantwortlicher</Label>
                    <Select value={assigneeFilter.toString()} onValueChange={(v) => setAssigneeFilter(v === "all" ? "all" : Number(v))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.memberName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Due Date Filter */}
                  <div>
                    <Label className="text-xs">Fälligkeit</Label>
                    <Select value={dueDateFilter} onValueChange={(v: any) => setDueDateFilter(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="overdue">Überfällig</SelectItem>
                        <SelectItem value="today">Heute</SelectItem>
                        <SelectItem value="week">Diese Woche</SelectItem>
                        <SelectItem value="month">Diesen Monat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Sort By */}
                  <div>
                    <Label className="text-xs">Sortieren nach</Label>
                    <div className="flex gap-1">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dueDate">Fälligkeitsdatum</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="createdAt">Erstellungsdatum</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                      >
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </Button>
                    </div>
                  </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {filteredAndSortedTasks.length} von {tasks.length} Aufgabe(n)
                    </div>
                  </CollapsibleContent>
                </div>
              </CardContent>
            </Collapsible>
          </Card>
        )}
        
        {/* Task list */}
        {!isLoading && tasks.length > 0 && (
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {batchMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={exitBatchMode}>
                      Abbrechen
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'Aufgabe' : 'Aufgaben'} ausgewählt
                    </span>
                    {selectedTaskIds.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={deselectAllTasks}>
                        Alle abwählen
                      </Button>
                    )}
                    {selectedTaskIds.length < tasks.filter(t => !t.isCompleted).length && (
                      <Button variant="ghost" size="sm" onClick={selectAllTasks}>
                        Alle auswählen
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setBatchMode(true)}>
                    Auswählen
                  </Button>
                )}
              </div>
            </div>
            
            {/* Batch Action Toolbar */}
            {batchMode && selectedTaskIds.length > 0 && (
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (!household || !member) return;
                        batchCompleteMutation.mutate({
                          taskIds: selectedTaskIds,
                          householdId: household.householdId,
                          memberId: member.memberId,
                        });
                      }}
                      disabled={batchCompleteMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Abschließen
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBatchAssignDialog(true)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Zuweisen
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBatchDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Lädt Aufgaben...
          </div>
        ) : tasks.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Keine Aufgaben vorhanden. Erstellen Sie oben eine neue Aufgabe!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTasks.map((task) => (
              <Card
                key={task.id}
                className={`shadow-sm transition-all duration-200 ${
                  batchMode ? "" : "cursor-pointer"
                } ${
                  task.isCompleted ? "opacity-60" : batchMode ? "" : "hover:shadow-md"
                } ${
                  selectedTaskIds.includes(task.id) ? "ring-2 ring-primary" : ""
                }`}
                onClick={(e) => {
                  if (batchMode) {
                    e.stopPropagation();
                    if (!task.isCompleted) {
                      toggleTaskSelection(task.id);
                    }
                  } else {
                    setSelectedTask(task);
                    setDetailDialogOpen(true);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {batchMode && (
                      <Checkbox
                        checked={selectedTaskIds.includes(task.id)}
                        disabled={task.isCompleted}
                        onCheckedChange={() => {
                          if (!task.isCompleted) {
                            toggleTaskSelection(task.id);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${task.isCompleted ? "line-through" : ""}`}>
                        {task.name}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                          {getMemberNames(task.assignedTo)}
                        </span>
                        <TaskDependencies
                          taskId={task.id}
                          dependencies={dependencies}
                          allTasks={tasks}
                          compact
                        />
                        {task.dueDate && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            new Date(task.dueDate) < new Date() && !task.isCompleted
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {(task.repeatUnit || (task.frequency && task.frequency !== "once")) ? "Nächster Termin:" : "Fällig:"}{" "}
                            {new Date(task.dueDate).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {task.frequency && task.frequency !== "once" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            <RefreshCw className="h-3 w-3" />
                            {task.frequency === "daily" && "Täglich"}
                            {task.frequency === "weekly" && "Wöchentlich"}
                            {task.frequency === "monthly" && "Monatlich"}
                            {task.frequency === "custom" && task.repeatInterval && task.repeatUnit
                              ? `Alle ${task.repeatInterval} ${task.repeatUnit === "days" ? "Tage" : task.repeatUnit === "weeks" ? "Wochen" : "Monate"}`
                              : "Benutzerdefiniert"}
                          </span>
                        )}
                        {task.enableRotation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                            <RefreshCw className="h-3 w-3" />
                            Rotation {task.requiredPersons ? `(${task.requiredPersons} Pers.)` : ""}
                          </span>
                        )}
                        {(task as any).isSharedWithUs && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Users className="h-3 w-3" />
                            Verknüpft mit {(task as any).householdName || "anderem Haushalt"}
                          </span>
                        )}
                        {!(task as any).isSharedWithUs && (task as any).sharedHouseholdCount > 0 && (task as any).sharedHouseholdNames && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            <Users className="h-3 w-3" />
                            Geteilt mit {(task as any).sharedHouseholdNames}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 shrink-0">
                      {!task.isCompleted && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setCompleteDialogOpen(true);
                            }}
                            className="touch-target text-green-600 hover:text-green-600 hover:bg-green-50"
                            title="Aufgabe abschließen"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setReminderDialogOpen(true);
                            }}
                            className="touch-target text-yellow-600 hover:text-yellow-600 hover:bg-yellow-50"
                            title="Erinnerung senden"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setMilestoneDialogOpen(true);
                            }}
                            className="touch-target text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Zwischensieg dokumentieren"
                          >
                            <Target className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task.id);
                        }}
                        className="touch-target text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Aufgabe löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {completeDialogOpen && selectedTask && (
        <CompleteTaskDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          task={{ ...selectedTask, isRecurring: Boolean(selectedTask.enableRepeat || selectedTask.repeatUnit || selectedTask.repeatInterval) }}
          onComplete={handleCompleteTask}
        />
      )}

      {milestoneDialogOpen && selectedTask && (
        <MilestoneDialog
          open={milestoneDialogOpen}
          onOpenChange={setMilestoneDialogOpen}
          task={selectedTask}
          onAddMilestone={handleAddMilestone}
        />
      )}

      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        task={selectedTask ? {
          ...selectedTask,
          assignedTo: selectedTask.assignedTo && selectedTask.assignedTo.length > 0
            ? selectedTask.assignedTo.map((id: number) => members.find(m => m.id === id)?.memberName).filter(Boolean).join(", ")
            : undefined,
        } : null}
        onSendReminder={handleSendReminder}
      />

      <TaskDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        task={selectedTask}
        members={members.map(m => ({ memberId: m.id, memberName: m.memberName }))}
        taskList={filteredAndSortedTasks}
        currentTaskIndex={selectedTask ? filteredAndSortedTasks.findIndex(t => t.id === selectedTask.id) : -1}
        onNavigatePrevious={() => {
          const currentIndex = selectedTask ? filteredAndSortedTasks.findIndex(t => t.id === selectedTask.id) : -1;
          if (currentIndex > 0) {
            setSelectedTask(filteredAndSortedTasks[currentIndex - 1]);
          }
        }}
        onNavigateNext={() => {
          const currentIndex = selectedTask ? filteredAndSortedTasks.findIndex(t => t.id === selectedTask.id) : -1;
          if (currentIndex >= 0 && currentIndex < filteredAndSortedTasks.length - 1) {
            setSelectedTask(filteredAndSortedTasks[currentIndex + 1]);
          }
        }}
        onTaskUpdated={(updatedTask) => {
          // Receive updated task directly from dialog
          setSelectedTask(updatedTask);
        }}
        onNavigateToTask={(taskId) => {
          const targetTask = tasks.find(t => t.id === taskId);
          if (targetTask) {
            setSelectedTask(targetTask);
          }
        }}
      />
      
      {/* Batch Assign Dialog */}
      <Dialog open={showBatchAssignDialog} onOpenChange={setShowBatchAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgaben zuweisen</DialogTitle>
            <DialogDescription>
              {selectedTaskIds.length} Aufgabe(n) einem Mitglied zuweisen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Mitglied auswählen</Label>
            <Select value={batchAssignTo?.toString() || ""} onValueChange={(value) => setBatchAssignTo(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Mitglied auswählen" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.memberName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchAssignDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!household || !member || !batchAssignTo) return;
                batchAssignMutation.mutate({
                  taskIds: selectedTaskIds,
                  householdId: household.householdId,
                  memberId: member.memberId,
                  assignedTo: batchAssignTo ? [batchAssignTo] : [], // Wrap in array
                });
                setShowBatchAssignDialog(false);
              }}
              disabled={!batchAssignTo || batchAssignMutation.isPending}
            >
              Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Batch Delete Dialog */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgaben löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich {selectedTaskIds.length} Aufgabe(n) löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!household || !member) return;
                batchDeleteMutation.mutate({
                  taskIds: selectedTaskIds,
                  householdId: household.householdId,
                  memberId: member.memberId,
                });
                setShowBatchDeleteDialog(false);
              }}
              disabled={batchDeleteMutation.isPending}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </AppLayout>
  );
}

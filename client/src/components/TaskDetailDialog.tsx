import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Repeat, Users, Edit, X, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Task {
  id: number;
  name: string;
  description?: string | null;
  assignedTo?: number | null;
  dueDate?: string | null;
  enableRepeat?: boolean | null;
  repeatInterval?: number | null;
  repeatUnit?: string | null;
  enableRotation?: boolean | null;
  requiredPersons?: number | null;
  projectId?: number | null;
  completed?: boolean;
  createdBy?: number | null;
  createdAt?: string | null;
  frequency?: string | null;
  customFrequencyDays?: number | null;
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
  onTaskUpdated?: () => void;
  onNavigateToTask?: (taskId: number) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange, members, onTaskUpdated, onNavigateToTask }: TaskDetailDialogProps) {
  const { household, member } = useCompatAuth();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  
  // Project state (must be declared before queries that use it)
  const [isProjectTask, setIsProjectTask] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [prerequisites, setPrerequisites] = useState<number[]>([]);
  const [followups, setFollowups] = useState<number[]>([]);
  
  // Load projects
  const { data: projects = [] } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open }
  );
  
  // Load available tasks for dependencies
  const { data: availableTasks = [] } = trpc.projects.getAvailableTasks.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household && open && isProjectTask }
  );
  
  // Load task dependencies
  const { data: taskDependencies } = trpc.projects.getTaskDependencies.useQuery(
    { taskId: task?.id ?? 0 },
    { enabled: !!task?.id }
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
      const hasRepeat = task.enableRepeat || (task.frequency && task.frequency !== "once");
      setEnableRepeat(hasRepeat);
      
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
      setIsProjectTask(!!task.projectId);
      setSelectedProjectId(task.projectId || null);
    }
  }, [task, open]);
  
  // Load existing dependencies when taskDependencies are fetched
  useEffect(() => {
    if (taskDependencies && task) {
      // taskDependencies is an object with { prerequisites: [], followups: [] }
      const prereqIds = taskDependencies.prerequisites?.map(dep => dep.id) || [];
      const followupIds = taskDependencies.followups?.map(dep => dep.id) || [];
      
      setPrerequisites(prereqIds);
      setFollowups(followupIds);
    }
  }, [taskDependencies, task]);

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: async () => {
      toast.success("Aufgabe aktualisiert");
      setIsEditing(false);
      
      // Invalidate queries after successful update
      if (task) {
        await utils.tasks.list.invalidate();
        if (household) {
          await utils.projects.getTaskDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
          await utils.projects.getDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
        }
      }
      
      if (onTaskUpdated) onTaskUpdated();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();
  const updateDependenciesMutation = trpc.projects.updateDependencies.useMutation();

  const handleSave = async () => {
    if (!household || !task) return;
    
    if (selectedAssignees.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Verantwortlichen");
      return;
    }

    const dueDateTimeString = dueDate && dueTime 
      ? `${dueDate}T${dueTime}:00`
      : dueDate 
      ? `${dueDate}T00:00:00`
      : null;

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
      await updateTask.mutateAsync({
        householdId: household.householdId,
        memberId: member?.memberId || 0,
        taskId: task.id,
        name: name || undefined,
        description: description || undefined,
        assignedTo: selectedAssignees[0] || undefined,
        dueDate: dueDateTimeString || undefined,
        frequency: frequency,
        customFrequencyDays: customFrequencyDays,
        repeatInterval: enableRepeat ? parseInt(repeatInterval) : undefined,
        repeatUnit: enableRepeat ? repeatUnit : undefined,
        enableRotation: enableRepeat && enableRotation,
        requiredPersons: enableRepeat && enableRotation ? requiredPersons : undefined,
        excludedMembers: enableRepeat && enableRotation ? excludedMembers : undefined,
        projectId: isProjectTask ? selectedProjectId : undefined,
      });
      
      // Update dependencies if this is a project task (replaces all existing)
      if (isProjectTask) {
        await updateDependenciesMutation.mutateAsync({
          taskId: task.id,
          householdId: household.householdId,
          prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
          followups: followups.length > 0 ? followups : undefined,
        });
        
        // Invalidate dependency queries after updating dependencies
        await utils.projects.getTaskDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
        await utils.projects.getDependencies.invalidate({ taskId: task.id, householdId: household.householdId });
      }
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
      const hasRepeat = task.enableRepeat || (task.frequency && task.frequency !== "once");
      setEnableRepeat(hasRepeat);
      
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
                </div>
                {selectedAssignees.length === 0 && (
                  <p className="text-xs text-destructive">Bitte wählen Sie mindestens einen Verantwortlichen</p>
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
                    Projektaufgabe
                  </Label>
                </div>

                {isProjectTask && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label>Projektzuordnung</Label>
                      <Select
                        value={selectedProjectId?.toString() || ""}
                        onValueChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Projekt auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            // View Mode
            <>
              <div className="space-y-4">
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

                {task.projectId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Projektaufgabe</Badge>
                    {projects.find(p => p.id === task.projectId) && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm"
                        onClick={() => {
                          onOpenChange(false);
                          // Navigate to projects page - the page will need to handle opening the project
                          // For now, just navigate to the projects page
                          window.location.href = `/projects#project-${task.projectId}`;
                        }}
                      >
                        → {projects.find(p => p.id === task.projectId)?.name}
                      </Button>
                    )}
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
              </div>
            </>
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
  );
}

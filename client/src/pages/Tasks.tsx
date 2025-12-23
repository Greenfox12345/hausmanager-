import { useState } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Target, Bell, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { ReminderDialog } from "@/components/ReminderDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TaskDependencies from "@/components/TaskDependencies";

export default function Tasks() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useHouseholdAuth();
  
  // Form state
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [prerequisites, setPrerequisites] = useState<number[]>([]);
  const [followups, setFollowups] = useState<number[]>([]);
  
  // Dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: projects = [] } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: availableTasks = [] } = trpc.projects.getAvailableTasks.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: dependencies = [] } = trpc.projects.getAllDependencies.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const createProjectMutation = trpc.projects.create.useMutation();
  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();

  const addMutation = trpc.tasks.add.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.projects.list.invalidate();
      utils.projects.getAvailableTasks.invalidate();
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
      setSelectedProjectId(null);
      setCreateNewProject(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setPrerequisites([]);
      setFollowups([]);
      toast.success("Aufgabe hinzugefügt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Aufgabe gelöscht");
    },
  });

  const completeTaskMutation = trpc.tasks.completeTask.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Aufgabe abgeschlossen!");
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

  if (!isAuthenticated || !household || !member) {
    setLocation("/login");
    return null;
  }

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
      let finalProjectId = selectedProjectId;

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
        finalProjectId = projectResult.projectId;
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
        assignedTo: selectedAssignees[0], // First assignee
        projectId: isProjectTask ? finalProjectId || undefined : undefined,
      });

      // Add dependencies if this is a project task
      if (isProjectTask && (prerequisites.length > 0 || followups.length > 0)) {
        await addDependenciesMutation.mutateAsync({
          taskId: taskResult.taskId,
          prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
          followups: followups.length > 0 ? followups : undefined,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Erstellen der Aufgabe");
    }
  };

  const handleDelete = (taskId: number) => {
    if (confirm("Möchten Sie diese Aufgabe wirklich löschen?")) {
      deleteMutation.mutate({
        taskId,
        householdId: household.householdId,
        memberId: member.memberId,
      });
    }
  };

  const handleCompleteTask = async (data: { comment?: string; photoUrls: string[] }) => {
    if (!selectedTask) return;
    await completeTaskMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const handleAddMilestone = async (data: { comment?: string; photoUrls: string[] }) => {
    if (!selectedTask) return;
    await milestoneMutation.mutateAsync({
      taskId: selectedTask.id,
      householdId: household.householdId,
      memberId: member.memberId,
      comment: data.comment,
      photoUrls: data.photoUrls,
    });
  };

  const handleSendReminder = async (data: { comment?: string }) => {
    if (!selectedTask) return;
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

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl">
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
                </div>
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
                  Projektaufgabe
                </Label>
              </div>

              {/* Project options (collapsible) */}
              {isProjectTask && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  {/* Project assignment section */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Projektzuordnung</Label>
                    
                    {/* Toggle between existing and new project */}
                    <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                      <Checkbox
                        id="createNewProject"
                        checked={createNewProject}
                        onCheckedChange={(checked) => {
                          setCreateNewProject(checked as boolean);
                          if (checked) setSelectedProjectId(null);
                        }}
                      />
                      <Label htmlFor="createNewProject" className="cursor-pointer text-sm">
                        Neues Projekt erstellen (diese Aufgabe wird zur Hauptaufgabe)
                      </Label>
                    </div>

                    {createNewProject ? (
                      <div className="space-y-3 pl-4">
                        <div className="space-y-2">
                          <Label htmlFor="newProjectName">Projektname *</Label>
                          <Input
                            id="newProjectName"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Name wird von Aufgabe übernommen"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newProjectDescription">Projektbeschreibung</Label>
                          <Textarea
                            id="newProjectDescription"
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            placeholder="Optionale Projektbeschreibung"
                            rows={2}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Hinweis: Zieltermin und Verantwortliche werden automatisch von der Aufgabe übernommen.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="selectProject">Bestehendes Projekt wählen</Label>
                        <Select
                          value={selectedProjectId?.toString() || "none"}
                          onValueChange={(v) => setSelectedProjectId(v === "none" ? null : parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Projekt auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kein Projekt</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                              <div key={task.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
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
                              <div key={task.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50">
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

        {/* Task list */}
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
            {tasks.map((task) => (
              <Card
                key={task.id}
                className={`shadow-sm transition-all duration-200 ${
                  task.isCompleted ? "opacity-60" : "hover:shadow-md"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
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
                          {getMemberName(task.assignedTo)}
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
                            Fällig: {new Date(task.dueDate).toLocaleDateString("de-DE", {
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
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!task.isCompleted && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
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
                            onClick={() => {
                              setSelectedTask(task);
                              setMilestoneDialogOpen(true);
                            }}
                            className="touch-target text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Zwischensieg dokumentieren"
                          >
                            <Target className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTask(task);
                              setReminderDialogOpen(true);
                            }}
                            className="touch-target text-yellow-600 hover:text-yellow-600 hover:bg-yellow-50"
                            title="Erinnerung senden"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
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

      <CompleteTaskDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        task={selectedTask}
        onComplete={handleCompleteTask}
      />

      <MilestoneDialog
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        task={selectedTask}
        onAddMilestone={handleAddMilestone}
      />

      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        task={selectedTask}
        onSendReminder={handleSendReminder}
      />
    </AppLayout>
  );
}

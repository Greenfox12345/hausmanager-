import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  FolderKanban, 
  Plus, 
  List, 
  GanttChart,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  Calendar as CalendarIcon,
  Users
} from "lucide-react";
import { format, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import GanttChartView from "@/components/GanttChartView";
import TaskDependencies from "@/components/TaskDependencies";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";

export default function Projects() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useHouseholdAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedExistingTasks, setSelectedExistingTasks] = useState<number[]>([]);

  // Task form state
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<number[]>([]);
  const [taskPrerequisites, setTaskPrerequisites] = useState<number[]>([]);
  const [taskFollowups, setTaskFollowups] = useState<number[]>([]);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState("");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months">("days");
  const [hasRotation, setHasRotation] = useState(false);
  const [rotationRequired, setRotationRequired] = useState("");
  const [rotationExcluded, setRotationExcluded] = useState<number[]>([]);

  // Form state for project creation/editing
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState<"planning" | "active" | "completed" | "cancelled">("planning");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [isNeighborhoodProject, setIsNeighborhoodProject] = useState(false);

  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Load all dependencies once for all tasks
  const { data: dependencies = [] } = trpc.projects.getAllDependencies.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Projekt erfolgreich erstellt");
      refetchProjects();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Fehler beim Erstellen des Projekts: " + error.message);
    },
  });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Projekt erfolgreich aktualisiert");
      refetchProjects();
      setIsEditDialogOpen(false);
      setEditingProject(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Fehler beim Aktualisieren des Projekts: " + error.message);
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Projekt erfolgreich gelöscht");
      refetchProjects();
      if (selectedProjectId === editingProject?.id) {
        setSelectedProjectId(null);
      }
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen des Projekts: " + error.message);
    },
  });

  // Auth check removed - causing redirect loops
  if (!household || !member) {
    return <div>Loading...</div>;
  }

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectStatus("planning");
    setProjectStartDate("");
    setProjectEndDate("");
    setIsNeighborhoodProject(false);
  };

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast.error("Bitte geben Sie einen Projektnamen ein");
      return;
    }

    createProjectMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: projectName,
      description: projectDescription || undefined,
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
      isNeighborhoodProject,
    });
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectName.trim()) {
      toast.error("Bitte geben Sie einen Projektnamen ein");
      return;
    }

    updateProjectMutation.mutate({
      id: editingProject.id,
      name: projectName,
      description: projectDescription || undefined,
      status: projectStatus,
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
      isNeighborhoodProject,
    });
  };

  const handleDeleteProject = (projectId: number) => {
    if (confirm("Möchten Sie dieses Projekt wirklich löschen?")) {
      deleteProjectMutation.mutate({ id: projectId });
    }
  };

  const openEditDialog = (project: any) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectStatus(project.status);
    setProjectStartDate(project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "");
    setProjectEndDate(project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : "");
    setIsNeighborhoodProject(project.isNeighborhoodProject || false);
    setIsEditDialogOpen(true);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = useMemo(
    () => selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : [],
    [selectedProjectId, tasks]
  );

  const addTaskMutation = trpc.tasks.add.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe erfolgreich hinzugefügt");
      refetchTasks();
      setIsAddTaskDialogOpen(false);
      resetTaskForm();
    },
    onError: (error) => {
      toast.error("Fehler beim Hinzufügen der Aufgabe: " + error.message);
    },
  });

  const addDependenciesMutation = trpc.projects.addDependencies.useMutation();

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Aufgaben erfolgreich zugeordnet");
      refetchTasks();
      setIsAssignTaskDialogOpen(false);
      setSelectedExistingTasks([]);
    },
    onError: (error) => {
      toast.error("Fehler beim Zuordnen der Aufgaben: " + error.message);
    },
  });

  const resetTaskForm = () => {
    setTaskName("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskDueTime("");
    setTaskAssignees([]);
    setTaskPrerequisites([]);
    setTaskFollowups([]);
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      toast.error("Bitte geben Sie einen Aufgabennamen ein");
      return;
    }

    if (!household || !selectedProjectId) {
      toast.error("Kein Projekt ausgewählt");
      return;
    }

    try {
      // Create due date from date and time
      let dueDateTime = null;
      if (taskDueDate) {
        dueDateTime = new Date(taskDueDate);
        if (taskDueTime) {
          const [hours, minutes] = taskDueTime.split(":");
          dueDateTime.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      // Create task
      const result = await addTaskMutation.mutateAsync({
        householdId: household.householdId,
        memberId: member?.memberId || 0,
        name: taskName,
        description: taskDescription || undefined,
        assignedTo: taskAssignees.length > 0 ? taskAssignees[0] : undefined,
        dueDate: dueDateTime ? dueDateTime.toISOString() : undefined,
        projectId: selectedProjectId,
        frequency: isRepeating && repeatInterval ? (
          repeatUnit === "days" ? "daily" : repeatUnit === "weeks" ? "weekly" : "monthly"
        ) : undefined,
        repeatInterval: isRepeating && repeatInterval ? parseInt(repeatInterval) : undefined,
        enableRotation: hasRotation,
        requiredPersons: hasRotation && rotationRequired ? parseInt(rotationRequired) : undefined,
        excludedMembers: hasRotation && rotationExcluded.length > 0 ? rotationExcluded : undefined,
      });

      // Add dependencies if any
      if (taskPrerequisites.length > 0 || taskFollowups.length > 0) {
        await addDependenciesMutation.mutateAsync({
          taskId: result.id,
          householdId: household.householdId,
          prerequisites: taskPrerequisites.length > 0 ? taskPrerequisites : undefined,
          followups: taskFollowups.length > 0 ? taskFollowups : undefined,
        });
      }
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const getMemberName = (memberId: number | null) => {
    if (!memberId) return "Nicht zugewiesen";
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || "Unbekannt";
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      planning: { label: "Planung", variant: "outline" as const },
      active: { label: "Aktiv", variant: "default" as const },
      completed: { label: "Abgeschlossen", variant: "outline" as const },
      cancelled: { label: "Abgebrochen", variant: "destructive" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.planning;
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Projekte</h1>
              <p className="text-muted-foreground">{household.householdName}</p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Neues Projekt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Neues Projekt erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Projektname *</Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="z.B. Gartenrenovierung"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Projektbeschreibung..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={projectStatus} onValueChange={(value: any) => setProjectStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planung</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                      <SelectItem value="cancelled">Abgebrochen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Startdatum</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={projectStartDate}
                      onChange={(e) => setProjectStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Enddatum</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={projectEndDate}
                      onChange={(e) => setProjectEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateProject}>
                  Projekt erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projektliste
            </h2>

            {projectsLoading ? (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Lade Projekte...</p>
                </CardContent>
              </Card>
            ) : projects.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Noch keine Projekte vorhanden. Erstellen Sie Ihr erstes Projekt!
                  </p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => {
                const projectTaskCount = tasks.filter(t => t.projectId === project.id).length;
                const completedTaskCount = tasks.filter(t => t.projectId === project.id && t.isCompleted).length;
                const statusBadge = getStatusBadge(project.status);

                return (
                  <Card
                    key={project.id}
                    className={`shadow-sm cursor-pointer transition-all hover:shadow-md ${
                      selectedProjectId === project.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={statusBadge.variant} className="text-xs">
                              {statusBadge.label}
                            </Badge>
                            {project.isNeighborhoodProject && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Nachbarschaft
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {completedTaskCount} / {projectTaskCount} Aufgaben erledigt
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(project);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Project Details */}
          <div className="lg:col-span-2">
            {!selectedProject ? (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Wählen Sie ein Projekt aus der Liste aus, um Details und Aufgaben anzuzeigen
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Project Header */}
                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FolderKanban className="h-5 w-5 text-primary" />
                          {selectedProject.name}
                        </CardTitle>
                        {selectedProject.description && (
                          <CardDescription className="mt-2">
                            {selectedProject.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddTaskDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Neue Aufgabe
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAssignTaskDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Bestehende zuordnen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProject(selectedProject);
                            setProjectName(selectedProject.name);
                            setProjectDescription(selectedProject.description || "");
                            setProjectStatus(selectedProject.status);
                            setProjectStartDate(selectedProject.startDate ? format(new Date(selectedProject.startDate), "yyyy-MM-dd") : "");
                            setProjectEndDate(selectedProject.endDate ? format(new Date(selectedProject.endDate), "yyyy-MM-dd") : "");
                            setIsNeighborhoodProject(selectedProject.isNeighborhoodProject || false);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Möchten Sie dieses Projekt wirklich löschen?")) {
                              deleteProjectMutation.mutate({ id: selectedProject.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Badge variant={getStatusBadge(selectedProject.status).variant}>
                        {getStatusBadge(selectedProject.status).label}
                      </Badge>
                      {selectedProject.startDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Start: {format(new Date(selectedProject.startDate), "dd.MM.yyyy")}
                        </Badge>
                      )}
                      {selectedProject.endDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Ende: {format(new Date(selectedProject.endDate), "dd.MM.yyyy")}
                        </Badge>
                      )}
                      {selectedProject.isNeighborhoodProject && (
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          Nachbarschaftsprojekt
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Task Views */}
                <Tabs defaultValue="list" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Listenansicht
                    </TabsTrigger>
                    <TabsTrigger value="gantt" className="flex items-center gap-2">
                      <GanttChart className="h-4 w-4" />
                      Gantt-Diagramm
                    </TabsTrigger>
                  </TabsList>

                  {/* List View */}
                  <TabsContent value="list">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">Aufgaben</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Keine Aufgaben in diesem Projekt. Erstellen Sie Aufgaben auf der Aufgabenseite.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {projectTasks.map((task) => {
                              const frequency = getFrequencyBadge(task);

                              return (
                                <Card 
                                  key={task.id} 
                                  className={`shadow-sm cursor-pointer ${task.isCompleted ? "opacity-60" : "hover:shadow-md"}`}
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsTaskDetailDialogOpen(true);
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
                                          {!task.isCompleted && task.dueDate && isPast(new Date(task.dueDate)) && (
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
                                          <TaskDependencies
                                            taskId={task.id}
                                            allTasks={tasks}
                                            dependencies={dependencies}
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

                  {/* Gantt View */}
                  <TabsContent value="gantt">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg">Gantt-Diagramm</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Keine Aufgaben in diesem Projekt. Erstellen Sie Aufgaben auf der Aufgabenseite.
                          </p>
                        ) : (
                          <GanttChartView tasks={projectTasks} members={members} />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Assign Existing Tasks Dialog */}
        <Dialog open={isAssignTaskDialogOpen} onOpenChange={setIsAssignTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bestehende Aufgaben zum Projekt zuordnen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Verfügbare Aufgaben (ohne Projektzuordnung)</Label>
                <div className="border rounded-md p-3 max-h-96 overflow-y-auto">
                  {tasks.filter(t => !t.projectId && !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Keine verfügbaren Aufgaben ohne Projektzuordnung
                    </p>
                  ) : (
                    tasks.filter(t => !t.projectId && !t.isCompleted).map((task) => (
                      <div key={task.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <Checkbox
                          id={`assign-task-${task.id}`}
                          checked={selectedExistingTasks.includes(task.id)}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              setSelectedExistingTasks([...selectedExistingTasks, task.id]);
                            } else {
                              setSelectedExistingTasks(selectedExistingTasks.filter(id => id !== task.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`assign-task-${task.id}`} className="font-medium cursor-pointer">
                            {task.name}
                          </Label>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Fällig: {format(new Date(task.dueDate), "dd.MM.yyyy, HH:mm")} Uhr
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignTaskDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={async () => {
                  if (selectedExistingTasks.length === 0) {
                    toast.error("Bitte wählen Sie mindestens eine Aufgabe aus");
                    return;
                  }

                  if (!selectedProjectId) {
                    toast.error("Kein Projekt ausgewählt");
                    return;
                  }

                  try {
                    // Update each selected task with the project ID
                    for (const taskId of selectedExistingTasks) {
                      await updateTaskMutation.mutateAsync({
                        taskId: taskId,
                        householdId: household!.householdId,
                        memberId: member!.memberId,
                        projectId: selectedProjectId,
                      });
                    }
                  } catch (error) {
                    console.error("Error assigning tasks:", error);
                  }
                }}
                disabled={selectedExistingTasks.length === 0}
              >
                {selectedExistingTasks.length} Aufgabe(n) zuordnen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aufgabe zu Projekt hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">Aufgabenname *</Label>
                <Input
                  id="task-name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="z.B. Rasen mähen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Beschreibung</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Aufgabenbeschreibung..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-dueDate">Fälligkeitsdatum</Label>
                  <Input
                    id="task-dueDate"
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-dueTime">Uhrzeit</Label>
                  <Input
                    id="task-dueTime"
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Verantwortliche *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`task-assignee-${m.id}`}
                        checked={taskAssignees.includes(m.id)}
                        onCheckedChange={() => {
                          setTaskAssignees(prev =>
                            prev.includes(m.id)
                              ? prev.filter(id => id !== m.id)
                              : [...prev, m.id]
                          );
                        }}
                      />
                      <Label htmlFor={`task-assignee-${m.id}`} className="cursor-pointer flex-1">
                        {m.memberName}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Voraussetzungen (optionale Aufgaben, die zuerst erledigt werden müssen)</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                  {tasks.filter(t => !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine offenen Aufgaben verfügbar</p>
                  ) : (
                    <>
                      {/* Project tasks */}
                      {projectTasks.filter(t => !t.isCompleted).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Projektaufgaben</p>
                          {projectTasks.filter(t => !t.isCompleted).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`prereq-${task.id}`}
                                checked={taskPrerequisites.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskPrerequisites([...taskPrerequisites, task.id]);
                                  } else {
                                    setTaskPrerequisites(taskPrerequisites.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`prereq-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Other household tasks */}
                      {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Andere Haushaltsaufgaben</p>
                          {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`prereq-${task.id}`}
                                checked={taskPrerequisites.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskPrerequisites([...taskPrerequisites, task.id]);
                                  } else {
                                    setTaskPrerequisites(taskPrerequisites.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`prereq-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Folgeaufgaben (optionale Aufgaben, die danach kommen)</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                  {tasks.filter(t => !t.isCompleted).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine offenen Aufgaben verfügbar</p>
                  ) : (
                    <>
                      {/* Project tasks */}
                      {projectTasks.filter(t => !t.isCompleted).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Projektaufgaben</p>
                          {projectTasks.filter(t => !t.isCompleted).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`followup-${task.id}`}
                                checked={taskFollowups.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskFollowups([...taskFollowups, task.id]);
                                  } else {
                                    setTaskFollowups(taskFollowups.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`followup-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Other household tasks */}
                      {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Andere Haushaltsaufgaben</p>
                          {tasks.filter(t => !t.isCompleted && !projectTasks.find(pt => pt.id === t.id)).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`followup-${task.id}`}
                                checked={taskFollowups.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTaskFollowups([...taskFollowups, task.id]);
                                  } else {
                                    setTaskFollowups(taskFollowups.filter(id => id !== task.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`followup-${task.id}`} className="text-sm font-normal cursor-pointer">
                                {task.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Repeat Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="task-repeat"
                    checked={isRepeating}
                    onCheckedChange={(checked) => setIsRepeating(checked === true)}
                  />
                  <Label htmlFor="task-repeat" className="cursor-pointer">
                    Aufgabe wiederholt sich
                  </Label>
                </div>
                {isRepeating && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="repeat-interval">Intervall</Label>
                      <Input
                        id="repeat-interval"
                        type="number"
                        min="1"
                        value={repeatInterval}
                        onChange={(e) => setRepeatInterval(e.target.value)}
                        placeholder="z.B. 7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repeat-unit">Einheit</Label>
                      <Select value={repeatUnit} onValueChange={(value: any) => setRepeatUnit(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Tage</SelectItem>
                          <SelectItem value="weeks">Wochen</SelectItem>
                          <SelectItem value="months">Monate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Rotation Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="task-rotation"
                    checked={hasRotation}
                    onCheckedChange={(checked) => setHasRotation(checked === true)}
                  />
                  <Label htmlFor="task-rotation" className="cursor-pointer">
                    Rotation zwischen Haushaltsmitgliedern
                  </Label>
                </div>
                {hasRotation && (
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="rotation-required">Erforderliche Anzahl Personen</Label>
                      <Input
                        id="rotation-required"
                        type="number"
                        min="1"
                        value={rotationRequired}
                        onChange={(e) => setRotationRequired(e.target.value)}
                        placeholder="z.B. 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ausgeschlossene Mitglieder</Label>
                      <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                        {members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Keine Mitglieder verfügbar</p>
                        ) : (
                          members.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`excluded-${m.id}`}
                                checked={rotationExcluded.includes(m.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRotationExcluded([...rotationExcluded, m.id]);
                                  } else {
                                    setRotationExcluded(rotationExcluded.filter(id => id !== m.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`excluded-${m.id}`} className="text-sm font-normal cursor-pointer">
                                {m.memberName}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleAddTask}>
                Aufgabe hinzufügen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Projekt bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Projektname *</Label>
                <Input
                  id="edit-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="z.B. Gartenrenovierung"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Beschreibung</Label>
                <Textarea
                  id="edit-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Projektbeschreibung..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={projectStatus} onValueChange={(value: any) => setProjectStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planung</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="cancelled">Abgebrochen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Startdatum</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">Enddatum</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdateProject}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <TaskDetailDialog
        open={isTaskDetailDialogOpen}
        onOpenChange={setIsTaskDetailDialogOpen}
        task={selectedTask}
        members={members.map(m => ({ memberId: m.id, memberName: m.memberName }))}
        onTaskUpdated={() => {
          window.location.reload();
        }}
      />
    </AppLayout>
  );
}

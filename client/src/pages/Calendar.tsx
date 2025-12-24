import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, List, FolderKanban, Target, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast } from "date-fns";
import { de } from "date-fns/locale";
import TaskDependencies from "@/components/TaskDependencies";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useHouseholdAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Dependencies are loaded per-task in TaskDependencies component

  const { data: projects = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  // Auth check removed - causing redirect loops
  if (!household || !member) {
    return <div>Loading...</div>;
  }

  // Group tasks by due date for calendar view
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {
      "no-project": tasks.filter(t => !t.projectId),
    };
    
    projects.forEach(project => {
      grouped[`project-${project.id}`] = tasks.filter(t => t.projectId === project.id);
    });
    
    return grouped;
  }, [tasks, projects]);

  // Get current month days for calendar
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get tasks for selected date
  const selectedDateTasks = selectedDate
    ? tasksByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const getMemberName = (memberId: number | null) => {
    if (!memberId) return "Nicht zugewiesen";
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || "Unbekannt";
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
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
            <p className="text-muted-foreground">{household.householdName}</p>
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
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentMonth, "MMMM yyyy", { locale: de })}
                </CardTitle>
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
                                  task.isCompleted ? "bg-green-500" : isPast(new Date(task.dueDate!)) ? "bg-red-500" : "bg-blue-500"
                                }`}
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
                          const projectName = getProjectName(task.projectId);
                          const frequency = getFrequencyBadge(task);
                          
                          return (
                            <Card key={task.id} className={`shadow-sm ${task.isCompleted ? "opacity-60" : ""}`}>
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
                                      {!task.isCompleted && isPast(new Date(task.dueDate!)) && (
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

          {/* All Tasks View */}
          <TabsContent value="all" className="space-y-4">
            {/* Tasks without project */}
            {tasksByProject["no-project"].length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Aufgaben ohne Projekt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasksByProject["no-project"].map(task => {
                      const frequency = getFrequencyBadge(task);
                      
                      return (
                        <Card key={task.id} className={`shadow-sm ${task.isCompleted ? "opacity-60" : ""}`}>
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
                </CardContent>
              </Card>
            )}

            {/* Projects with tasks */}
            {projects.map(project => {
              const projectTasks = tasksByProject[`project-${project.id}`] || [];
              if (projectTasks.length === 0) return null;
              
              return (
                <Card key={project.id} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projectTasks.map(task => {
                        const frequency = getFrequencyBadge(task);
                        
                        return (
                          <Card key={task.id} className={`shadow-sm ${task.isCompleted ? "opacity-60" : ""}`}>
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
                  </CardContent>
                </Card>
              );
            })}

            {/* No projects message */}
            {projects.length === 0 && tasksByProject["no-project"].length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="py-16 text-center">
                  <FolderKanban className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Keine Projekte vorhanden</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Erstellen Sie Projektaufgaben auf der Aufgabenseite, um sie hier zu sehen.
                  </p>
                  <Button onClick={() => setLocation("/tasks")}>
                    Zur Aufgabenseite
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

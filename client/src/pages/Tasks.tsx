import { useState } from "react";
import { useLocation } from "wouter";
import { useHouseholdAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, RefreshCw, Calendar } from "lucide-react";

const FREQUENCIES = [
  { value: "once", label: "Einmalig" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "custom", label: "Benutzerdefiniert" },
] as const;

export default function Tasks() {
  const [, setLocation] = useLocation();
  const { household, member, isAuthenticated } = useHouseholdAuth();
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskFrequency, setNewTaskFrequency] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [enableRotation, setEnableRotation] = useState(false);
  const [assignedMemberId, setAssignedMemberId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const { data: members = [] } = trpc.household.getHouseholdMembers.useQuery(
    { householdId: household?.householdId ?? 0 },
    { enabled: !!household }
  );

  const addMutation = trpc.tasks.add.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setNewTaskName("");
      setNewTaskDescription("");
      setNewTaskFrequency("once");
      setEnableRotation(false);
      setAssignedMemberId("");
      toast.success("Aufgabe hinzugefügt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = trpc.tasks.toggleComplete.useMutation({
    onMutate: async ({ taskId, isCompleted }) => {
      await utils.tasks.list.cancel();
      const previousTasks = utils.tasks.list.getData({ householdId: household?.householdId ?? 0 });
      
      utils.tasks.list.setData(
        { householdId: household?.householdId ?? 0 },
        (old) => old?.map((task) =>
          task.id === taskId ? { ...task, isCompleted } : task
        )
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      utils.tasks.list.setData(
        { householdId: household?.householdId ?? 0 },
        context?.previousTasks
      );
      toast.error("Fehler beim Aktualisieren");
    },
    onSettled: () => {
      utils.tasks.list.invalidate();
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Aufgabe gelöscht");
    },
  });

  if (!isAuthenticated || !household || !member) {
    setLocation("/login");
    return null;
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    addMutation.mutate({
      householdId: household.householdId,
      memberId: member.memberId,
      name: newTaskName.trim(),
      description: newTaskDescription.trim() || undefined,
      frequency: newTaskFrequency,
      enableRotation,
      assignedTo: assignedMemberId ? parseInt(assignedMemberId) : undefined,
    });
  };

  const handleToggleComplete = (taskId: number, currentStatus: boolean) => {
    toggleMutation.mutate({
      taskId,
      householdId: household.householdId,
      memberId: member.memberId,
      isCompleted: !currentStatus,
    });
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

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCIES.find((f) => f.value === frequency)?.label || frequency;
  };

  const getMemberName = (memberId: number | null) => {
    if (!memberId) return "Nicht zugewiesen";
    const memberData = members.find((m) => m.id === memberId);
    return memberData?.memberName || "Unbekannt";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
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
              <div className="space-y-2">
                <Label htmlFor="taskName">Aufgabenname</Label>
                <Input
                  id="taskName"
                  placeholder="z.B. Küche putzen, Müll rausbringen..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Beschreibung (optional)</Label>
                <Textarea
                  id="taskDescription"
                  placeholder="Details zur Aufgabe..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskFrequency">Häufigkeit</Label>
                  <Select value={newTaskFrequency} onValueChange={(value: any) => setNewTaskFrequency(value)}>
                    <SelectTrigger id="taskFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedMember">Zugewiesen an</Label>
                  <Select value={assignedMemberId} onValueChange={setAssignedMemberId}>
                    <SelectTrigger id="assignedMember">
                      <SelectValue placeholder="Nicht zugewiesen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nicht zugewiesen</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.memberName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                <Switch
                  id="enableRotation"
                  checked={enableRotation}
                  onCheckedChange={setEnableRotation}
                />
                <Label htmlFor="enableRotation" className="cursor-pointer flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Rotation aktivieren (Aufgabe rotiert nach Abschluss)
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {addMutation.isPending ? "Wird erstellt..." : "Aufgabe erstellen"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
                    <Checkbox
                      checked={task.isCompleted}
                      onCheckedChange={() => handleToggleComplete(task.id, task.isCompleted)}
                      className="mt-1 touch-target"
                    />
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          <Calendar className="h-3 w-3" />
                          {getFrequencyLabel(task.frequency)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                          {getMemberName(task.assignedTo)}
                        </span>
                        {task.enableRotation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                            <RefreshCw className="h-3 w-3" />
                            Rotation
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

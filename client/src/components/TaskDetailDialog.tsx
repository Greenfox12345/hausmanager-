import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
}

export function TaskDetailDialog({ task, open, onOpenChange, members, onTaskUpdated }: TaskDetailDialogProps) {
  const { household, member } = useCompatAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly" | "monthly" | "custom">("once");
  const [customFrequencyDays, setCustomFrequencyDays] = useState(1);
  const [enableRotation, setEnableRotation] = useState(false);
  const [requiredPersons, setRequiredPersons] = useState(1);

  // Load task data when dialog opens or task changes
  useEffect(() => {
    if (task && open) {
      setName(task.name || "");
      setDescription(task.description || "");
      setAssignedTo(task.assignedTo || null);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        setDueDate(format(date, "yyyy-MM-dd"));
        setDueTime(format(date, "HH:mm"));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Map old repeat fields to frequency
      if (task.enableRepeat) {
        if (task.repeatUnit === "days" && task.repeatInterval === 1) {
          setFrequency("daily");
        } else if (task.repeatUnit === "weeks" && task.repeatInterval === 1) {
          setFrequency("weekly");
        } else if (task.repeatUnit === "months" && task.repeatInterval === 1) {
          setFrequency("monthly");
        } else {
          setFrequency("custom");
          setCustomFrequencyDays(task.repeatInterval || 1);
        }
      } else {
        setFrequency("once");
      }
      setEnableRotation(task.enableRotation || false);
      setRequiredPersons(task.requiredPersons || 1);
    }
  }, [task, open]);

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe aktualisiert");
      setIsEditing(false);
      if (onTaskUpdated) onTaskUpdated();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!task || !household) return;

    const dueDateTimeString = dueDate && dueTime 
      ? `${dueDate}T${dueTime}:00`
      : dueDate 
      ? `${dueDate}T00:00:00`
      : null;

    updateTask.mutate({
      householdId: household.householdId,
      memberId: member?.memberId || 0,
      taskId: task.id,
      name: name || undefined,
      description: description || undefined,
      assignedTo: assignedTo || undefined,
      dueDate: dueDateTimeString || undefined,
      frequency: frequency || undefined,
      customFrequencyDays: frequency === "custom" ? customFrequencyDays : undefined,
      enableRotation: enableRotation || undefined,
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    if (task) {
      setName(task.name || "");
      setDescription(task.description || "");
      setAssignedTo(task.assignedTo || null);
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        setDueDate(format(date, "yyyy-MM-dd"));
        setDueTime(format(date, "HH:mm"));
      } else {
        setDueDate("");
        setDueTime("");
      }
      
      // Map old repeat fields to frequency
      if (task.enableRepeat) {
        if (task.repeatUnit === "days" && task.repeatInterval === 1) {
          setFrequency("daily");
        } else if (task.repeatUnit === "weeks" && task.repeatInterval === 1) {
          setFrequency("weekly");
        } else if (task.repeatUnit === "months" && task.repeatInterval === 1) {
          setFrequency("monthly");
        } else {
          setFrequency("custom");
          setCustomFrequencyDays(task.repeatInterval || 1);
        }
      } else {
        setFrequency("once");
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
                <Label htmlFor="task-assignee">Verantwortlich</Label>
                <Select
                  value={assignedTo?.toString() || "none"}
                  onValueChange={(value) => setAssignedTo(value === "none" ? null : parseInt(value))}
                >
                  <SelectTrigger id="task-assignee">
                    <SelectValue placeholder="Niemand zugewiesen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Niemand zugewiesen</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.memberId} value={member.memberId.toString()}>
                        {member.memberName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="space-y-2">
                  <Label htmlFor="task-frequency">Häufigkeit</Label>
                  <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                    <SelectTrigger id="task-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Einmalig</SelectItem>
                      <SelectItem value="daily">Täglich</SelectItem>
                      <SelectItem value="weekly">Wöchentlich</SelectItem>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {frequency === "custom" && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="custom-days">Alle X Tage</Label>
                    <Input
                      id="custom-days"
                      type="number"
                      min="1"
                      value={customFrequencyDays}
                      onChange={(e) => setCustomFrequencyDays(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-rotation">Rotation aktivieren</Label>
                  <Switch
                    id="task-rotation"
                    checked={enableRotation}
                    onCheckedChange={setEnableRotation}
                  />
                </div>

                {enableRotation && (
                  <div className="space-y-2 pl-4">
                    <Label htmlFor="required-persons">Benötigte Personen</Label>
                    <Input
                      id="required-persons"
                      type="number"
                      min="1"
                      max={members.length}
                      value={requiredPersons}
                      onChange={(e) => setRequiredPersons(parseInt(e.target.value) || 1)}
                    />
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

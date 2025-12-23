import { useState } from "react";
import { Edit, Trash2, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Task {
  id: number;
  name: string;
  description?: string | null;
  assignedTo?: number | null;
  dueDate?: Date | null;
  frequency?: string;
  customFrequencyDays?: number | null;
  enableRotation?: boolean;
}

interface TaskActionsProps {
  task: Task;
  currentMemberId: number;
  householdId: number;
  onSuccess?: () => void;
}

export function TaskActions({ task, currentMemberId, householdId, onSuccess }: TaskActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editedTask, setEditedTask] = useState({
    name: task.name,
    description: task.description || "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
  });

  const isAssignee = task.assignedTo === currentMemberId;

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe aktualisiert");
      setIsEditDialogOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Aktualisieren");
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Aufgabe gelöscht");
      setIsDeleteDialogOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  const createProposalMutation = trpc.proposals.createEditProposal.useMutation({
    onSuccess: () => {
      toast.success("Bearbeitungsvorschlag eingereicht");
      setIsProposalDialogOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Einreichen");
    },
  });

  const handleEdit = () => {
    updateTaskMutation.mutate({
      taskId: task.id,
      householdId,
      memberId: currentMemberId,
      name: editedTask.name,
      description: editedTask.description,
      dueDate: editedTask.dueDate || undefined,
    });
  };

  const handlePropose = () => {
    const proposedChanges: Record<string, any> = {};
    
    if (editedTask.name !== task.name) {
      proposedChanges.name = editedTask.name;
    }
    if (editedTask.description !== (task.description || "")) {
      proposedChanges.description = editedTask.description;
    }
    if (editedTask.dueDate) {
      proposedChanges.dueDate = editedTask.dueDate;
    }

    if (Object.keys(proposedChanges).length === 0) {
      toast.error("Keine Änderungen vorgenommen");
      return;
    }

    createProposalMutation.mutate({
      taskId: task.id,
      proposedBy: currentMemberId,
      proposedChanges,
    });
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate({
      taskId: task.id,
      householdId,
      memberId: currentMemberId,
    });
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {isAssignee ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              title="Bearbeiten"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProposalDialogOpen(true)}
            title="Bearbeitungsvorschlag"
          >
            <FileEdit className="h-4 w-4 mr-1" />
            Vorschlag
          </Button>
        )}
      </div>

      {/* Edit Dialog (for assignee) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Aufgabenname</Label>
              <Input
                id="edit-name"
                value={editedTask.name}
                onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={editedTask.description}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-dueDate">Fälligkeitsdatum</Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                value={editedTask.dueDate}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEdit} disabled={updateTaskMutation.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog (for non-assignee) */}
      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bearbeitungsvorschlag einreichen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Sie sind nicht für diese Aufgabe verantwortlich. Ihre Änderungen werden als Vorschlag
              an den Verantwortlichen gesendet.
            </p>
            <div>
              <Label htmlFor="propose-name">Aufgabenname</Label>
              <Input
                id="propose-name"
                value={editedTask.name}
                onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="propose-description">Beschreibung</Label>
              <Textarea
                id="propose-description"
                value={editedTask.description}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="propose-dueDate">Fälligkeitsdatum</Label>
              <Input
                id="propose-dueDate"
                type="datetime-local"
                value={editedTask.dueDate}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handlePropose} disabled={createProposalMutation.isPending}>
              Vorschlag einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Aufgabe "{task.name}" wirklich löschen? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTaskMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

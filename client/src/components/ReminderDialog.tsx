import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Bell } from "lucide-react";

interface Task {
  id: number;
  name: string;
  description?: string;
  assignedTo?: string;
}

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSendReminder: (data: { comment?: string }) => Promise<void>;
}

export function ReminderDialog({
  open,
  onOpenChange,
  task,
  onSendReminder,
}: ReminderDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      await onSendReminder({
        comment: comment.trim() || undefined,
      });
      // Reset form
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending reminder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            Erinnerung senden
          </DialogTitle>
          <DialogDescription>
            Senden Sie eine Erinnerung für die Aufgabe "{task.name}"
            {task.assignedTo && ` an ${task.assignedTo}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task details */}
          {task.description && (
            <div className="space-y-2">
              <Label>Aufgabenbeschreibung:</Label>
              <div className="text-sm text-muted-foreground border rounded-lg p-3">
                {task.description}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="reminder-comment">Nachricht (optional)</Label>
            <Textarea
              id="reminder-comment"
              placeholder="z.B. Bitte nicht vergessen, ist dringend..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              "Erinnerung senden"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

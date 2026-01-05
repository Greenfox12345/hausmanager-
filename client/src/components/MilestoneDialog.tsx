import { useState, useEffect, useRef, useCallback } from "react";
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
import { PhotoUpload } from "./PhotoUpload";
import { Loader2, Target } from "lucide-react";

interface Task {
  id: number;
  name: string;
  description?: string;
}

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onAddMilestone: (data: { comment?: string; photoUrls: string[] }) => Promise<void>;
}

export function MilestoneDialog({
  open,
  onOpenChange,
  task,
  onAddMilestone,
}: MilestoneDialogProps) {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevOpenRef = useRef(open);

  // Stable callback for PhotoUpload
  const handlePhotosChange = useCallback((newPhotos: string[]) => {
    console.log('[MilestoneDialog] onPhotosChange called with:', newPhotos);
    setPhotos(newPhotos);
  }, []);

  // Reset form only when dialog closes (open changes from true to false)
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      // Dialog was just closed
      setComment("");
      setPhotos([]);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleSubmit = async () => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      await onAddMilestone({
        comment: comment.trim() || undefined,
        photoUrls: photos,
      });
      // Reset form
      setComment("");
      setPhotos([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding milestone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    setPhotos([]);
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Zwischensieg dokumentieren
          </DialogTitle>
          <DialogDescription>
            Dokumentieren Sie einen Fortschritt bei "{task.name}". Die Aufgabe bleibt offen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Aufgabe</Label>
              <p className="font-medium">{task.name}</p>
            </div>
            {task.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Beschreibung</Label>
                <p className="text-sm text-muted-foreground">{task?.description}</p>
              </div>
            )}
          </div>

          {/* Task details */}
          {false && task?.description && (
            <div className="space-y-2">
              <Label>Aufgabenbeschreibung:</Label>
              <div className="text-sm text-muted-foreground border rounded-lg p-3">
                {task?.description}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="milestone-comment">Fortschrittsbeschreibung *</Label>
            <Textarea
              id="milestone-comment"
              placeholder="z.B. Erste Hälfte erledigt, Material besorgt..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Fotos (optional)</Label>
            <PhotoUpload photos={photos} onPhotosChange={handlePhotosChange} maxPhotos={5} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              "Zwischensieg speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

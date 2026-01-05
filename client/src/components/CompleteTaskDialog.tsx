import { useState, useEffect, useRef, memo } from "react";
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
import { Loader2, CheckCircle2 } from "lucide-react";

interface Task {
  id: number;
  name: string;
  description?: string;
}

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onComplete: (data: { comment?: string; photoUrls: string[] }) => Promise<void>;
}

const CompleteTaskDialogComponent = function CompleteTaskDialog({
  open,
  onOpenChange,
  task,
  onComplete,
}: CompleteTaskDialogProps) {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const prevOpenRef = useRef(open);

  // Debug: Log photos state changes
  useEffect(() => {
    console.log('[CompleteTaskDialog] photos state changed:', photos);
  }, [photos]);

  // Callback for PhotoUpload with logging
  const handlePhotosChange = (newPhotos: string[]) => {
    console.log('[CompleteTaskDialog] onPhotosChange called with:', newPhotos);
    setPhotos(newPhotos);
    console.log('[CompleteTaskDialog] setPhotos called');
  };

  // Reset form only when dialog closes (open changes from true to false)
  useEffect(() => {
    console.log('[CompleteTaskDialog] open changed:', { prev: prevOpenRef.current, current: open });
    if (prevOpenRef.current && !open) {
      // Dialog was just closed
      console.log('[CompleteTaskDialog] Resetting form');
      setComment("");
      setPhotos([]);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleSubmit = async () => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        comment: comment.trim() || undefined,
        photoUrls: photos,
      });
      // Reset form
      setComment("");
      setPhotos([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing task:", error);
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

  // Prevent closing dialog while uploading
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) {
      console.log('[CompleteTaskDialog] Prevented closing during upload');
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent key={`complete-content-${task?.id}`} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Aufgabe abschließen
          </DialogTitle>
          <DialogDescription>
            Sie sind dabei, die Aufgabe "{task.name}" als erledigt zu markieren.
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
            <Label htmlFor="comment">Kommentar (optional)</Label>
            <Textarea
              id="comment"
              placeholder="z.B. Alles erledigt, hat 2 Stunden gedauert..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Fotos (optional)</Label>
            <PhotoUpload 
              photos={photos} 
              onPhotosChange={handlePhotosChange} 
              onUploadingChange={setIsUploading}
              maxPhotos={5} 
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
                Wird gespeichert...
              </>
            ) : (
              "Aufgabe abschließen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CompleteTaskDialog = CompleteTaskDialogComponent;

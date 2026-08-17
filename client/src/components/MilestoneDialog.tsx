import { useState, useEffect } from "react";
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
import { BalanceEffortFields, type BalanceEffortDraft } from "./BalanceEffortFields";
import { Loader2, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";

interface Task {
  id: number;
  name: string;
  description?: string;
}

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onAddMilestone: (data: { comment?: string; photoUrls: {url: string, filename: string}[]; fileUrls?: {url: string, filename: string}[] }) => Promise<void>;
}

const MilestoneDialogComponent = function MilestoneDialog({
  open,
  onOpenChange,
  task,
  onAddMilestone,
}: MilestoneDialogProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{url: string, filename: string}[]>([]);
  const [files, setFiles] = useState<{url: string, filename: string}[]>([]);
  const [balanceEfforts, setBalanceEfforts] = useState<BalanceEffortDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { household, member } = useCompatAuth();
  const createBalanceEntryMutation = trpc.balance.create.useMutation();

  // Callback for PhotoUpload
  const handlePhotosChange = (newPhotos: {url: string, filename: string}[]) => {
    setPhotos(newPhotos);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setComment("");
      setPhotos([]);
      setFiles([]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      await onAddMilestone({
        comment: comment.trim() || undefined,
        photoUrls: photos,
        fileUrls: files,
      });
      if (household?.householdId && member?.memberId) {
        await Promise.all(balanceEfforts.map((effort) => createBalanceEntryMutation.mutateAsync({
          householdId: household.householdId,
          recordedByMemberId: member.memberId,
          memberId: effort.memberId,
          entryType: effort.entryType,
          amount: effort.amount,
          minutes: effort.minutes,
          description: effort.description,
          sourceType: "milestone",
          sourceId: task.id,
          sourceLabel: task.name,
        })));
      }
      // Reset form
      setComment("");
      setPhotos([]);
      setFiles([]);
      setBalanceEfforts([]);
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
    setFiles([]);
    onOpenChange(false);
  };

  if (!task) return null;

  // Prevent closing dialog while uploading
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent key={`milestone-content-${task?.id}`} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {t("tasks:milestoneDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks:milestoneDialog.description", { name: task.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">{t("tasks:completeDialog.task")}</Label>
              <p className="font-medium">{task.name}</p>
            </div>
            {task.description && (
              <div>
                <Label className="text-xs text-muted-foreground">{t("tasks:fields.description")}</Label>
                <p className="text-sm text-muted-foreground">{task?.description}</p>
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="milestone-comment">{t("tasks:milestoneDialog.progressLabel")}</Label>
            <Textarea
              id="milestone-comment"
              placeholder={t("tasks:milestoneDialog.progressPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
            />
          </div>

          {household?.householdId && member?.memberId && (
            <BalanceEffortFields
              key={`balance-milestone-${task.id}-${open ? "open" : "closed"}`}
              householdId={household.householdId}
              memberId={member.memberId}
              defaultDescription={task.name}
              onChange={setBalanceEfforts}
            />
          )}

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>{t("tasks:completeDialog.photos")}</Label>
            <PhotoUpload 
              photos={photos} 
              onPhotosChange={handlePhotosChange} 
              onUploadingChange={setIsUploading}
              maxPhotos={5} 
            />
          </div>

          {/* PDF upload */}
          <div className="space-y-2">
            <Label>{t("tasks:completeDialog.pdfs")}</Label>
            <PhotoUpload 
              photos={files} 
              onPhotosChange={setFiles} 
              onUploadingChange={setIsUploading}
              maxPhotos={5}
              acceptedFileTypes=".pdf"
              fileTypeLabel="PDF"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {t("common:actions.cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common:actions.saving")}
              </>
            ) : (
              t("tasks:milestoneDialog.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const MilestoneDialog = MilestoneDialogComponent;

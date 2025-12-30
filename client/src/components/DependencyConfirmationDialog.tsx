import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface DependencyLink {
  taskId: number;
  taskName: string;
  type: "prerequisite" | "followup";
}

interface DependencyConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTaskName: string;
  dependencies: DependencyLink[];
  onConfirm: (selectedDependencies: { taskId: number; type: "prerequisite" | "followup" }[]) => void;
}

export function DependencyConfirmationDialog({
  open,
  onOpenChange,
  currentTaskName,
  dependencies,
  onConfirm,
}: DependencyConfirmationDialogProps) {
  const [selectedDependencies, setSelectedDependencies] = useState<Record<number, boolean>>({});

  const handleToggle = (taskId: number) => {
    setSelectedDependencies((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleConfirm = () => {
    const selected = dependencies
      .filter((dep) => selectedDependencies[dep.taskId])
      .map((dep) => ({ taskId: dep.taskId, type: dep.type }));
    onConfirm(selected);
    onOpenChange(false);
    setSelectedDependencies({});
  };

  const handleSkip = () => {
    onConfirm([]);
    onOpenChange(false);
    setSelectedDependencies({});
  };

  if (dependencies.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aufgabenverknüpfungen bestätigen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Möchten Sie die bidirektionalen Verknüpfungen für die folgenden Aufgaben erstellen?
          </p>

          <div className="space-y-3">
            {dependencies.map((dep) => (
              <div
                key={dep.taskId}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`dep-${dep.taskId}`}
                  checked={selectedDependencies[dep.taskId] || false}
                  onCheckedChange={() => handleToggle(dep.taskId)}
                />
                <Label
                  htmlFor={`dep-${dep.taskId}`}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2 text-sm">
                    {dep.type === "prerequisite" ? (
                      <>
                        <span className="font-medium">{dep.taskName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-primary">{currentTaskName}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-primary">{currentTaskName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{dep.taskName}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dep.type === "prerequisite"
                      ? `"${currentTaskName}" wird als Folgeaufgabe für "${dep.taskName}" gespeichert`
                      : `"${currentTaskName}" wird als Voraussetzung für "${dep.taskName}" gespeichert`}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Überspringen
          </Button>
          <Button onClick={handleConfirm}>
            Ausgewählte Verknüpfungen erstellen ({Object.values(selectedDependencies).filter(Boolean).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

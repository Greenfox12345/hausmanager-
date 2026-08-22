import { useEffect, useMemo, useState } from "react";
import { ClipboardPenLine, Loader2, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/PhotoUpload";
import { trpc } from "@/lib/trpc";
import { useCompatAuth } from "@/hooks/useCompatAuth";

type UploadReference = { url: string; filename: string };

type TaskVariableInputDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: number;
    name: string;
    description?: string | null;
    projectIds?: number[] | null;
    variableInputNames?: string[] | null;
  } | null;
  variables?: Array<{ name: string; unit?: string | null }> | null;
  /** Optional: Beim Abschluss nur bisher fehlende Variablen zur Auswahl anbieten. */
  onlyVariableNames?: string[];
};

/**
 * Hält einen Mess-, Prüf- oder Rechenwert nachvollziehbar an der konkreten Aufgabe fest.
 * Dateien werden über den bestehenden Upload-Baustein in den Dateispeicher übertragen.
 */
export function TaskVariableInputDialog({ open, onOpenChange, task, variables, onlyVariableNames }: TaskVariableInputDialogProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const { household, member } = useCompatAuth();
  const utils = trpc.useUtils();
  const configuredNames = useMemo(() => (
    onlyVariableNames ?? (Array.isArray(task?.variableInputNames) ? task.variableInputNames : [])
  ), [onlyVariableNames, task?.variableInputNames]);
  const [variableName, setVariableName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<UploadReference[]>([]);
  const [files, setFiles] = useState<UploadReference[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { data: existingInputs = [] } = trpc.tasks.listVariableInputs.useQuery(
    { householdId: household?.householdId ?? 0, taskId: task?.id ?? 0 },
    { enabled: open && Boolean(household?.householdId && task?.id) },
  );

  const selectedVariable = variables?.find((candidate) => candidate.name === variableName);
  const addVariableInputMutation = trpc.tasks.addVariableInput.useMutation({
    onSuccess: async () => {
      if (household?.householdId && task?.id) {
        await Promise.all([
          utils.tasks.listVariableInputs.invalidate({ householdId: household.householdId, taskId: task.id }),
          utils.activities.getByTaskId.invalidate({ householdId: household.householdId, taskId: task.id }),
          utils.tasks.list.invalidate({ householdId: household.householdId }),
          utils.planProjects.getWithPlanData.invalidate({ projectId: task.projectIds?.[0] ?? 0 }),
          utils.planProjects.getVariablesForProjects.invalidate(),
        ]);
      }
      toast.success(t("tasks:variableInput.saved", "Variableneingabe dokumentiert"));
      setValue("");
      setNote("");
      setPhotos([]);
      setFiles([]);
    },
    onError: (error) => toast.error(error.message || t("tasks:variableInput.saveError", "Variableneingabe konnte nicht gespeichert werden")),
  });

  useEffect(() => {
    if (!open) return;
    const initialName = configuredNames[0] ?? "";
    setVariableName(initialName);
    setUnit(variables?.find((candidate) => candidate.name === initialName)?.unit ?? "");
    setValue("");
    setNote("");
    setPhotos([]);
    setFiles([]);
  }, [open, configuredNames, variables]);

  useEffect(() => {
    if (selectedVariable?.unit !== undefined) setUnit(selectedVariable.unit ?? "");
  }, [selectedVariable?.unit]);

  useEffect(() => {
    if (!open || !variableName) return;
    const previous = [...existingInputs].reverse().find((entry) => entry.variableName === variableName);
    if (!previous) return;
    setValue(previous.value);
    setUnit(previous.unit ?? selectedVariable?.unit ?? "");
    setNote(previous.note ?? "");
  }, [open, variableName, existingInputs, selectedVariable?.unit]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isUploading || addVariableInputMutation.isPending)) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!task || !household?.householdId || !member?.memberId || !variableName || !value.trim()) return;
    addVariableInputMutation.mutate({
      householdId: household.householdId,
      taskId: task.id,
      memberId: member.memberId,
      projectId: task.projectIds?.[0],
      variableName,
      value: value.trim(),
      unit: unit.trim() || undefined,
      note: note.trim() || undefined,
      photoUrls: photos,
      fileUrls: files,
    });
  };

  if (!task || !household?.householdId || !member?.memberId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPenLine className="h-5 w-5 text-blue-600" />
            {t("tasks:variableInput.title", "Variablen eingeben")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks:variableInput.description", "Dokumentieren Sie den für diese Aufgabe ermittelten Wert. Einträge erscheinen im Verlauf der Aufgabe.")}
            <span className="mt-1 block">{t("tasks:variableInput.projectValueConfirmation", "Der Wert wird vorgemerkt und erst beim Abschluss dieser Aufgabe für den Projektdurchlauf bestätigt.")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{t("tasks:completeDialog.task", "Aufgabe")}</p>
            <p className="font-medium">{task.name}</p>
          </div>

          {configuredNames.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="task-variable-name">{t("tasks:variableInput.variable", "Variable")}</Label>
              <Select value={variableName} onValueChange={setVariableName}>
                <SelectTrigger id="task-variable-name"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {configuredNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{t("tasks:variableInput.variable", "Variable")}</Label>
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{variableName}</p>
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-variable-value">{t("tasks:variableInput.value", "Wert")}</Label>
              <Input id="task-variable-value" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("tasks:variableInput.valuePlaceholder", "z. B. 120")} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-variable-unit">{t("tasks:variableInput.unit", "Einheit")}</Label>
              <Input id="task-variable-unit" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="cm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-variable-note">{t("tasks:variableInput.note", "Erläuterung")}</Label>
            <Textarea id="task-variable-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={t("tasks:variableInput.notePlaceholder", "Messung, Berechnung oder Besonderheiten festhalten")}/>
          </div>

          <div className="space-y-2">
            <Label>{t("tasks:variableInput.photos", "Foto oder Zeichnung")}</Label>
            <PhotoUpload photos={photos} onPhotosChange={setPhotos} onUploadingChange={setIsUploading} maxPhotos={5} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{t("tasks:variableInput.pdfs", "PDF-Anhänge")}</Label>
            <PhotoUpload photos={files} onPhotosChange={setFiles} onUploadingChange={setIsUploading} maxPhotos={5} acceptedFileTypes=".pdf" fileTypeLabel="PDF" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addVariableInputMutation.isPending}>{t("common:actions.cancel", "Abbrechen")}</Button>
          <Button onClick={handleSubmit} disabled={!variableName || !value.trim() || isUploading || addVariableInputMutation.isPending}>
            {addVariableInputMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("common:actions.saving", "Speichern")}</> : t("tasks:variableInput.save", "Eingabe speichern")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

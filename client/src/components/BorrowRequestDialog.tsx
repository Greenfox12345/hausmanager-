import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BorrowRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId: number;
  onSubmit: (data: {
    startDate: Date;
    endDate: Date;
    message?: string;
  }) => void;
  isSubmitting?: boolean;
  // Task and occurrence context
  taskName?: string;
  occurrenceNumber?: number;
  occurrenceDate?: Date;
  assignedMembers?: string[];
  // Pre-filled dates
  initialStartDate?: Date | string | null;
  initialEndDate?: Date | string | null;
}

export function BorrowRequestDialog({
  open,
  onOpenChange,
  itemName,
  itemId,
  onSubmit,
  isSubmitting = false,
  taskName,
  occurrenceNumber,
  occurrenceDate,
  assignedMembers = [],
  initialStartDate,
  initialEndDate,
}: BorrowRequestDialogProps) {
  const { t } = useTranslation(["borrow", "common"]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState("");

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (open) {
      // Set dates from initial values
      if (initialStartDate) {
        const date = typeof initialStartDate === 'string' ? new Date(initialStartDate) : initialStartDate;
        setStartDate(date);
      } else if (occurrenceDate) {
        setStartDate(occurrenceDate);
      }

      if (initialEndDate) {
        const date = typeof initialEndDate === 'string' ? new Date(initialEndDate) : initialEndDate;
        setEndDate(date);
      } else if (occurrenceDate) {
        setEndDate(occurrenceDate);
      }

      // Generate pre-filled message with task context
      if (taskName && occurrenceNumber) {
        const dateStr = occurrenceDate ? format(occurrenceDate, "dd.MM.yyyy", { locale: de }) : `${t("borrow:occurrence")} ${occurrenceNumber}`;
        const membersStr = assignedMembers.length > 0 ? `\n${t("borrow:responsible")}: ${assignedMembers.join(", ")}` : "";
        
        setMessage(
          `${t("borrow:requestMessagePrefix", { itemName })}\n\n` +
          `${t("borrow:task")}: ${taskName}\n` +
          `${t("borrow:occurrence")}: ${dateStr} (${t("borrow:occurrence")} ${occurrenceNumber})${membersStr}\n\n` +
          t("borrow:requestMessageSuffix")
        );
      }
    }
  }, [open, initialStartDate, initialEndDate, occurrenceDate, taskName, occurrenceNumber, assignedMembers, itemName, t]);

  // Load guidelines
  const { data: guidelines } = trpc.borrow.getGuidelines.useQuery(
    { itemId },
    { enabled: open && !!itemId }
  );

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      return;
    }

    onSubmit({
      startDate,
      endDate,
      message: message.trim() || undefined,
    });

    // Reset form
    setStartDate(undefined);
    setEndDate(undefined);
    setMessage("");
  };

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("borrow:requestDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("borrow:requestDialog.item")}</Label>
            <div className="text-sm text-muted-foreground">{itemName}</div>
          </div>

          {/* Task and Occurrence Context */}
          {taskName && occurrenceNumber && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <div className="text-sm font-medium">{taskName}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  {occurrenceDate ? format(occurrenceDate, "dd.MM.yyyy", { locale: de }) : `${t("borrow:occurrence")} ${occurrenceNumber}`}
                </div>
                {assignedMembers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {t("borrow:responsible")}: {assignedMembers.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guidelines Display */}
          {guidelines && (guidelines.instructionsText || (guidelines.checklistItems as any[])?.length > 0 || (guidelines.photoRequirements as any[])?.length > 0) && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {t("borrow:requestDialog.guidelines")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {guidelines.instructionsText && (
                  <div>
                    <div className="font-medium mb-1">{t("borrow:requestDialog.instructions")}:</div>
                    <div className="text-muted-foreground whitespace-pre-wrap">
                      {guidelines.instructionsText}
                    </div>
                  </div>
                )}

                {(guidelines.checklistItems as any[])?.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">{t("borrow:requestDialog.returnChecklist")}:</div>
                    <div className="space-y-1">
                      {(guidelines.checklistItems as any[]).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox disabled checked={false} />
                          <span className="text-muted-foreground">
                            {item.label}
                            {item.required && <span className="text-destructive ml-1">*</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(guidelines.photoRequirements as any[])?.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">{t("borrow:requestDialog.requiredPhotosReturn")}:</div>
                    <div className="space-y-2">
                      {(guidelines.photoRequirements as any[]).map((req: any) => (
                        <div key={req.id} className="flex items-start gap-2">
                          <ImageIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="text-muted-foreground">
                              {req.label}
                              {req.required && <span className="text-destructive ml-1">*</span>}
                            </span>
                            {req.examplePhotoUrl && (
                              <div className="mt-1">
                                <img
                                  src={req.examplePhotoUrl}
                                  alt={t("common:labels.preview")}
                                  className="h-20 w-20 object-cover rounded border"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <span className="text-destructive">*</span> = {t("borrow:requestDialog.requiredOnReturn")}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{t("borrow:requestDialog.from")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP", { locale: de })
                    ) : (
                      <span>{t("borrow:requestDialog.selectDate")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">{t("borrow:requestDialog.to")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP", { locale: de })
                    ) : (
                      <span>{t("borrow:requestDialog.selectDate")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => {
                      const today = new Date(new Date().setHours(0, 0, 0, 0));
                      if (date < today) return true;
                      if (startDate && date < startDate) return true;
                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && startDate > endDate && (
            <div className="text-sm text-destructive">
              {t("borrow:requestDialog.endAfterStart")}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">{t("borrow:requestDialog.message")}</Label>
            <Textarea
              id="message"
              placeholder={t("borrow:requestDialog.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? t("borrow:requestDialog.sending") : t("borrow:requestDialog.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

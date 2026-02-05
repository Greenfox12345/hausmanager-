import { useState } from "react";
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
}

export function BorrowRequestDialog({
  open,
  onOpenChange,
  itemName,
  itemId,
  onSubmit,
  isSubmitting = false,
}: BorrowRequestDialogProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState("");

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Item ausleihen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item</Label>
            <div className="text-sm text-muted-foreground">{itemName}</div>
          </div>

          {/* Guidelines Display */}
          {guidelines && (guidelines.instructionsText || (guidelines.checklistItems as any[])?.length > 0 || (guidelines.photoRequirements as any[])?.length > 0) && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Ausleihvorgaben
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {guidelines.instructionsText && (
                  <div>
                    <div className="font-medium mb-1">Anweisungen:</div>
                    <div className="text-muted-foreground whitespace-pre-wrap">
                      {guidelines.instructionsText}
                    </div>
                  </div>
                )}

                {(guidelines.checklistItems as any[])?.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">Checkliste bei Rückgabe:</div>
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
                    <div className="font-medium mb-2">Erforderliche Fotos bei Rückgabe:</div>
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
                                  alt="Beispiel"
                                  className="h-16 w-16 object-cover rounded border"
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
                  <span className="text-destructive">*</span> = Pflichtfeld bei Rückgabe
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Von</Label>
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
                      <span>Datum wählen</span>
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
              <Label htmlFor="end-date">Bis</Label>
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
                      <span>Datum wählen</span>
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
              Das Enddatum muss nach dem Startdatum liegen
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Nachricht (optional)</Label>
            <Textarea
              id="message"
              placeholder="Warum möchtest du dieses Item ausleihen?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Wird gesendet..." : "Anfrage senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

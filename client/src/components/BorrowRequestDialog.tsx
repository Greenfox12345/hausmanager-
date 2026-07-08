import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, AlertCircle, Image as ImageIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocaleSync } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import { QuantityInput } from "@/components/QuantityInput";
import { useUserAuth } from "@/contexts/UserAuthContext";

interface BorrowRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId: number;
  onSubmit: (data: {
    startDate: Date;
    endDate: Date;
    message?: string;
    loanQuantity?: number;
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
  const { t, i18n } = useTranslation(["borrow", "common"]);
  const dateFnsLocale = getDateFnsLocaleSync(i18n.language);
  const { currentHousehold } = useUserAuth();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState("");
  const [loanQuantity, setLoanQuantity] = useState<number | null>(null);

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (open) {
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

      if (taskName && occurrenceNumber) {
        const dateStr = occurrenceDate ? format(occurrenceDate, "dd.MM.yyyy", { locale: dateFnsLocale }) : `${t("borrow:occurrence")} ${occurrenceNumber}`;
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

  // Check availability for the selected period
  const checkStart = startDate ?? new Date();
  const checkEnd = endDate ?? startDate ?? new Date();
  const { data: availability } = trpc.inventoryAvailability.checkItemAvailability.useQuery(
    {
      inventoryItemId: itemId,
      startDate: checkStart,
      endDate: checkEnd,
      currentMemberId: currentHousehold?.memberId,
      currentHouseholdId: currentHousehold?.householdId,
    },
    { enabled: open && !!itemId }
  );

  // Units query for the item
  const { data: units } = trpc.units.list.useQuery(
    { householdId: currentHousehold?.householdId ?? 0 },
    { enabled: open && !!currentHousehold }
  );

  // Derive available quantity and set default loanQuantity
  const availableQty = availability?.availableQuantity ?? null;
  const totalQty = availability?.totalQuantity ?? null;
  const hasQuantity = totalQty !== null && totalQty > 0;

  useEffect(() => {
    if (open && hasQuantity && availableQty !== null) {
      setLoanQuantity(Math.max(1, availableQty));
    } else if (open && !hasQuantity) {
      setLoanQuantity(null);
    }
  }, [open, hasQuantity, availableQty]);

  // Get unit symbol for the item
  const itemUnit = useMemo(() => {
    if (!units) return null;
    return null; // unit is on the item, not fetched here – shown via availability
  }, [units]);

  const handleSubmit = () => {
    if (!startDate || !endDate) return;

    onSubmit({
      startDate,
      endDate,
      message: message.trim() || undefined,
      loanQuantity: hasQuantity && loanQuantity !== null ? loanQuantity : undefined,
    });

    setStartDate(undefined);
    setEndDate(undefined);
    setMessage("");
    setLoanQuantity(null);
  };

  const isValid = startDate && endDate && startDate <= endDate &&
    (!hasQuantity || (loanQuantity !== null && loanQuantity >= 1 && (availableQty === null || loanQuantity <= availableQty)));

  // Availability badge
  const renderAvailabilityBadge = () => {
    if (!availability) return null;
    if (availability.status === "available") {
      return (
        <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
          {totalQty !== null ? t("borrow:quantity.available", { count: availableQty ?? totalQty }) : t("borrow:available")}
        </Badge>
      );
    }
    if (availability.status === "unavailable") {
      return (
        <Badge variant="outline" className="border-red-500 text-red-700 text-xs">
          {t("borrow:quantity.unavailable")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">
        {availableQty !== null
          ? t("borrow:quantity.partiallyAvailable", { count: availableQty })
          : t("borrow:partiallyAvailable")}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("borrow:requestDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("borrow:requestDialog.item")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{itemName}</span>
              {renderAvailabilityBadge()}
            </div>
          </div>

          {/* Task and Occurrence Context */}
          {taskName && occurrenceNumber && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <div className="text-sm font-medium">{taskName}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  {occurrenceDate ? format(occurrenceDate, "dd.MM.yyyy", { locale: dateFnsLocale }) : `${t("borrow:occurrence")} ${occurrenceNumber}`}
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
                      format(startDate, "PPP", { locale: dateFnsLocale })
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
                      format(endDate, "PPP", { locale: dateFnsLocale })
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

          {/* Quantity selector – only shown when item has a quantity */}
          {hasQuantity && (
            <div className="space-y-2">
              <Label>{t("borrow:quantity.label")}</Label>
              <QuantityInput
                value={loanQuantity}
                onChange={setLoanQuantity}
                units={units ?? []}
                unitId={null}
                onUnitChange={() => {}}
                showUnitSelector={false}
                max={availableQty ?? undefined}
              />
              {/* Conflict info */}
              {availability && availability.conflictingBorrows.length > 0 && (
                <div className="space-y-1 pt-1">
                  {availability.conflictingBorrows.map((conflict) => (
                    <div key={conflict.id} className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <Info className="h-3 w-3 mt-0.5 shrink-0 text-yellow-600" />
                      <span>
                        {t("borrow:quantity.conflict", {
                          count: conflict.remainingQuantity,
                          start: format(new Date(conflict.startDate), "dd.MM.yy", { locale: dateFnsLocale }),
                          end: format(new Date(conflict.endDate), "dd.MM.yy", { locale: dateFnsLocale }),
                        })}
                        {conflict.borrowerName && (
                          <span className="ml-1 font-medium">
                            {t("borrow:quantity.conflictBy", { name: conflict.borrowerName })}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {availableQty !== null && loanQuantity !== null && loanQuantity > availableQty && (
                <div className="text-xs text-destructive">
                  {t("borrow:quantity.exceedsAvailable", { max: availableQty })}
                </div>
              )}
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

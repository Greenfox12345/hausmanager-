import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { de, enGB } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  /** Value as yyyy-MM-dd string (same as input[type=date]) */
  value: string;
  /** Called with yyyy-MM-dd string or "" when cleared */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Drop-in replacement for <Input type="date" value={...} onChange={...} />.
 * Uses shadcn Calendar with dynamic locale so month names and weekdays
 * are shown in the active UI language.
 */
export function DatePickerInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  id,
}: DatePickerInputProps) {
  const { t, i18n } = useTranslation("common");
  const dateFnsLocale = i18n.language === "de" ? de : enGB;

  // Parse yyyy-MM-dd string → Date | undefined
  const selected: Date | undefined = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const [open, setOpen] = React.useState(false);

  const displayLabel = selected
    ? format(selected, "PPP", { locale: dateFnsLocale })
    : (placeholder ?? t("labels.selectDate"));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            onChange(day ? format(day, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          locale={dateFnsLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

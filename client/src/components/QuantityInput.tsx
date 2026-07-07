import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export interface UnitOption {
  id: number;
  name: string;
  symbol?: string | null;
}

interface QuantityInputProps {
  /** Current quantity value (null = not set) */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Currently selected unit id */
  unitId: number | null;
  onUnitChange: (unitId: number | null) => void;
  /** Available units to choose from */
  units: UnitOption[];
  disabled?: boolean;
  /** If true, the quantity field is shown even when value is null (e.g. in forms) */
  alwaysShow?: boolean;
}

/**
 * Returns the step size for +/- buttons based on the current value.
 * - value < 100  → step 1
 * - 100 ≤ value < 1000 → step 50
 * - value ≥ 1000 → step 500
 */
function getStep(value: number): number {
  if (value >= 1000) return 500;
  if (value >= 100) return 50;
  return 1;
}

/**
 * Formats a quantity number for display: removes trailing zeros after decimal.
 * e.g. 2.000 → "2", 1.500 → "1.5"
 */
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  // Show up to 3 decimal places, strip trailing zeros
  return parseFloat(num.toFixed(3)).toString();
}

/**
 * Returns a display label combining quantity and unit symbol/name.
 * e.g. "2 kg" or "500 g" or "3 Stück"
 */
export function formatQuantityWithUnit(
  quantity: number | string | null | undefined,
  unit: UnitOption | null | undefined
): string {
  const q = formatQuantity(quantity);
  if (!q) return "";
  const unitLabel = unit?.symbol || unit?.name || "";
  return unitLabel ? `${q} ${unitLabel}` : q;
}

export function QuantityInput({
  value,
  onChange,
  unitId,
  onUnitChange,
  units,
  disabled = false,
  alwaysShow = true,
}: QuantityInputProps) {
  const { t } = useTranslation("units");

  const currentValue = value ?? 0;
  const step = getStep(currentValue);

  const handleDecrement = () => {
    const next = Math.max(0, currentValue - step);
    onChange(next === 0 ? null : next);
  };

  const handleIncrement = () => {
    onChange(currentValue + step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "0") {
      onChange(null);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Decrement button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={handleDecrement}
        disabled={disabled || currentValue <= 0}
        aria-label={t("decrement", "Menge verringern")}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      {/* Quantity text input */}
      <Input
        type="number"
        min="0"
        step="any"
        value={value !== null ? formatQuantity(value) : ""}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={t("quantityPlaceholder", "Menge")}
        className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={t("quantity", "Menge")}
      />

      {/* Increment button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={handleIncrement}
        disabled={disabled}
        aria-label={t("increment", "Menge erhöhen")}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {/* Unit selector */}
      <Select
        value={unitId !== null ? String(unitId) : "__none__"}
        onValueChange={(v) => onUnitChange(v === "__none__" ? null : Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-28 h-9">
          <SelectValue placeholder={t("unitPlaceholder", "Einheit")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t("noUnit", "Keine Einheit")}</SelectItem>
          {units.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.symbol ? `${u.name} (${u.symbol})` : u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

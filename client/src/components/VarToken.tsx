/**
 * VarToken – Inline-Darstellung einer VAR-Variable in Aufgaben-Texten
 *
 * - Zeigt den berechneten Wert (wenn bekannt) oder "?" (wenn unbekannt)
 * - Farbig entsprechend der Variablen-Farbe
 * - Bei Klick: wechselt zwischen Wert und Variablenname (toggle)
 * - Tooltip: zeigt immer "VARName = Wert" oder "VARName (kein Wert)"
 */
import { useState } from "react";
import { type PlanVariable } from "@/lib/varParser";
import { evaluateFormula, buildVarValueMap } from "@/lib/varParser";

interface VarTokenProps {
  varName: string;
  variables: PlanVariable[];
  unit?: string;
}

export function VarToken({ varName, variables, unit }: VarTokenProps) {
  const [showName, setShowName] = useState(false);

  // Variable aus der Liste suchen
  const varDef = variables.find(v => v.name === varName);
  const color = varDef?.color ?? "#8b5cf6";

  // Wert berechnen
  const rawMap = buildVarValueMap(variables);
  let displayValue: string | null = null;
  let tooltipText = `VAR${varName}`;

  if (varDef?.value) {
    const result = evaluateFormula(varDef.value, rawMap, varName);
    if (result.ok) {
      displayValue = result.display;
      const unitStr = varDef.unit ?? unit ?? "";
      tooltipText = `VAR${varName} = ${result.display}${unitStr ? ` ${unitStr}` : ""}`;
    } else {
      tooltipText = `VAR${varName} (${varDef.value} – noch nicht auflösbar)`;
    }
  } else {
    tooltipText = `VAR${varName} (kein Wert)`;
  }

  const unitStr = varDef?.unit ?? unit ?? "";

  return (
    <button
      type="button"
      title={tooltipText}
      onClick={() => setShowName(s => !s)}
      className="inline-flex items-center rounded px-0.5 font-mono font-semibold text-[0.85em] leading-tight cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        color,
        backgroundColor: `${color}18`, // sehr heller Hintergrund in der Variablen-Farbe
        border: `1px solid ${color}40`,
      }}
    >
      {showName ? (
        <span>VAR{varName}</span>
      ) : displayValue !== null ? (
        <span>{displayValue}{unitStr ? ` ${unitStr}` : ""}</span>
      ) : (
        <span title={tooltipText}>?</span>
      )}
    </button>
  );
}

/**
 * VarText – rendert einen Text mit eingebetteten VarToken-Komponenten.
 * Ersetzt alle VAR-Token durch <VarToken>-Elemente.
 */
import { tokenizeWithVars, buildVarColorMap } from "@/lib/varParser";

interface VarTextProps {
  text: string;
  variables: PlanVariable[];
  className?: string;
}

export function VarText({ text, variables, className }: VarTextProps) {
  const colorMap = buildVarColorMap(variables);
  const segments = tokenizeWithVars(text, colorMap);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === "var" ? (
          <VarToken key={i} varName={seg.varName} variables={variables} />
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

import { describe, expect, it } from "vitest";
import { buildVarValueMap, evaluateFormula, type PlanVariable } from "../client/src/lib/varParser";

function resolveBoundary(boundary: string | number | undefined, variables: PlanVariable[]) {
  if (boundary === undefined || String(boundary).trim() === "") return undefined;
  const direct = Number(String(boundary).replace(",", "."));
  if (Number.isFinite(direct)) return direct;
  const result = evaluateFormula(String(boundary), buildVarValueMap(variables));
  return result.ok ? result.value : undefined;
}

describe("Aufgabenvariablen – Bereichsgrenzen", () => {
  it("akzeptiert eine freie numerische Unter- und Obergrenze", () => {
    const variables: PlanVariable[] = [{ name: "Höhe", color: "#000000", min: "30", max: "120", inputScope: "runtime" }];
    expect(resolveBoundary(variables[0].min, variables)).toBe(30);
    expect(resolveBoundary(variables[0].max, variables)).toBe(120);
  });

  it("löst eine abhängige Bereichsgrenze aus einer anderen Projektvariable auf", () => {
    const variables: PlanVariable[] = [
      { name: "MaxHöhe", color: "#000000", value: "120", inputScope: "fixed" },
      { name: "Höhe", color: "#000000", min: "VARMaxHöhe / 2", max: "VARMaxHöhe", inputScope: "runtime" },
    ];
    expect(resolveBoundary(variables[1].min, variables)).toBe(60);
    expect(resolveBoundary(variables[1].max, variables)).toBe(120);
  });
});

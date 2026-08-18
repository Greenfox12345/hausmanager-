import { describe, expect, it } from "vitest";
import { toRevealVariables } from "../shared/projectVariableReveal";

describe("Projektvariablen für die aufklappbare Anzeige", () => {
  it("übernimmt Formeldefinitionen und priorisiert bewusste Überschreibungen", () => {
    const variables = toRevealVariables([
      { name: "Länge", value: "4" },
      { name: "Stücke", description: "VARStücke = VARLänge / 2" },
      { name: "Manuell", description: "VARManuell = VARLänge * 2", overrideValue: "7" },
    ]);
    expect(variables.map((variable) => variable.value)).toEqual(["4", "VARLänge / 2", "7"]);
  });
});

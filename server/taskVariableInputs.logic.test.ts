import { describe, expect, it } from "vitest";
import { getMissingTaskVariableInputNames } from "../shared/taskVariableInputs";

describe("getMissingTaskVariableInputNames", () => {
  it("meldet nur konfigurierte Variablen ohne dokumentierte Eingabe", () => {
    expect(getMissingTaskVariableInputNames(
      ["Breite", "Höhe", "Material"],
      [{ variableName: "Breite" }, { variableName: "NichtZugeordnet" }],
    )).toEqual(["Höhe", "Material"]);
  });

  it("behandelt leere Daten sicher und gibt doppelte Konfigurationen nur einmal zurück", () => {
    expect(getMissingTaskVariableInputNames(undefined, undefined)).toEqual([]);
    expect(getMissingTaskVariableInputNames(["Breite", "Breite", ""], [])).toEqual(["Breite"]);
  });
});

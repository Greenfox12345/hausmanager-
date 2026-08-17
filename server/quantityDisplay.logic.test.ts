import { describe, expect, it } from "vitest";
import { formatQuantityDisplay } from "../shared/quantityDisplay";

describe("Mengenanzeige", () => {
  it("entfernt unbedeutende Dezimalstellen und behält notwendige Nachkommastellen", () => {
    expect(formatQuantityDisplay("1.000", "de-DE", "kg")).toBe("1 kg");
    expect(formatQuantityDisplay("1.250", "de-DE", "kg")).toBe("1,25 kg");
    expect(formatQuantityDisplay(3, "en-GB", "pcs")).toBe("3 pcs");
  });
});

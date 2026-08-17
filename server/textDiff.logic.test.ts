import { describe, expect, it } from "vitest";
import { getWordDiff } from "../shared/textDiff";

describe("wortbasierter Beschreibungsvergleich", () => {
  it("markiert entfernte und neue Wörter getrennt", () => {
    expect(getWordDiff("Alte kurze Beschreibung", "Neue kurze Erklärung")).toEqual([
      { value: "Alte ", type: "removed" },
      { value: "Neue ", type: "added" },
      { value: "kurze ", type: "unchanged" },
      { value: "Beschreibung", type: "removed" },
      { value: "Erklärung", type: "added" },
    ]);
  });
});

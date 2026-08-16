import { describe, expect, it } from "vitest";
import { getActivityBaseline, normalizeReadThrough } from "../shared/activityVisitRules";

describe("Besuchszeitpunkt für den Aktivitätsüberblick", () => {
  it("verwendet beim ersten Besuch den Beitrittszeitpunkt", () => {
    const joined = new Date(2026, 7, 10, 9, 0);
    expect(getActivityBaseline(null, joined)).toEqual(joined);
  });

  it("verwendet bei späteren Besuchen den zuletzt bestätigten Zeitpunkt", () => {
    const joined = new Date(2026, 7, 10, 9, 0);
    const viewed = new Date(2026, 7, 12, 18, 0);
    expect(getActivityBaseline(viewed, joined)).toEqual(viewed);
  });

  it("begrenzt einen zukünftigen Client-Zeitpunkt auf die Serverzeit", () => {
    const now = new Date(2026, 7, 13, 12, 0);
    expect(normalizeReadThrough(new Date(2026, 7, 14), now)).toEqual(now);
  });
});

import { describe, expect, it } from "vitest";
import {
  getFollowupClosure,
  getPrerequisiteClosure,
  wouldCreatePrerequisiteCycle,
  type TaskDependencyEdge,
} from "../shared/taskDependencies";

const dependencies: TaskDependencyEdge[] = [
  { taskId: 2, dependsOnTaskId: 1, dependencyType: "prerequisite" },
  { taskId: 1, dependsOnTaskId: 2, dependencyType: "followup" },
  { taskId: 3, dependsOnTaskId: 2, dependencyType: "prerequisite" },
  { taskId: 2, dependsOnTaskId: 3, dependencyType: "followup" },
];

describe("Aufgaben-Abhängigkeitsgraph", () => {
  it("ermittelt transitive Voraussetzungen", () => {
    expect(Array.from(getPrerequisiteClosure(3, dependencies)).sort()).toEqual([1, 2]);
  });

  it("ermittelt transitive Folgeaufgaben", () => {
    expect(Array.from(getFollowupClosure(1, dependencies)).sort()).toEqual([2, 3]);
  });

  it("erkennt Selbstbezüge und gerichtete Zyklen", () => {
    expect(wouldCreatePrerequisiteCycle(1, 1, dependencies)).toBe(true);
    expect(wouldCreatePrerequisiteCycle(1, 3, dependencies)).toBe(true);
    expect(wouldCreatePrerequisiteCycle(3, 4, dependencies)).toBe(false);
  });
});

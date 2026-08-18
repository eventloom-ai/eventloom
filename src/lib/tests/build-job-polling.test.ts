import { describe, expect, it } from "vitest";
import { hasRunningBuildJobs } from "@/lib/build-job-polling";

describe("build-job polling", () => {
  it("does not poll when no build is active", () => {
    expect(hasRunningBuildJobs([])).toBe(false);
    expect(hasRunningBuildJobs([{ status: "succeeded" }, { status: "failed" }])).toBe(false);
  });

  it("polls while at least one build is running", () => {
    expect(hasRunningBuildJobs([{ status: "succeeded" }, { status: "running" }])).toBe(true);
  });
});

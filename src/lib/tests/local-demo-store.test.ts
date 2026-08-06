import { describe, expect, it } from "vitest";
import { createLocalDemoJob, finishLocalDemoJob, getLocalDemoJob, updateLocalDemoJob } from "@/lib/local-demo-store";

describe("local demo build store", () => {
  it("keeps build progress available for polling without Supabase", () => {
    const job = createLocalDemoJob("garden-party");
    updateLocalDemoJob(job.id, {
      step: "planned",
      message: "Preview planned.",
      progressPercent: 36,
    });
    finishLocalDemoJob(job.id, "succeeded");

    expect(getLocalDemoJob(job.id)).toMatchObject({
      status: "succeeded",
      slug: "garden-party",
      progressStep: "done",
      progressPercent: 100,
    });
  });
});

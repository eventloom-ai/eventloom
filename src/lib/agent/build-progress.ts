import type { BuildProgressStep } from "@/lib/agent/progress";

export const BUILD_PROGRESS: Record<BuildProgressStep, number> = {
  started: 3,
  planning: 12,
  planned: 38,
  generating: 45,
  saving: 72,
  done: 100,
  error: 0,
};

export function progressForStep(step: BuildProgressStep, phase?: string) {
  if (step === "generating" && phase === "content_ready") {
    return 68;
  }

  if (step === "saving") {
    if (phase === "event_saved") return 80;
    if (phase === "version_saved") return 86;
    if (phase === "images_saved") return 92;
    if (phase === "finalizing") return 97;
    return BUILD_PROGRESS.saving;
  }

  return BUILD_PROGRESS[step] ?? 0;
}

export function softProgressFloor(step: BuildProgressStep, phase?: string) {
  return progressForStep(step, phase);
}

export function softProgressCeiling(step: BuildProgressStep, phase?: string) {
  if (step === "planning") return BUILD_PROGRESS.planned - 2;
  if (step === "generating" && !phase) return progressForStep("generating", "content_ready") - 2;
  if (step === "generating" && phase === "content_ready") return BUILD_PROGRESS.saving - 2;
  if (step === "saving") {
    if (!phase) return progressForStep("saving", "event_saved") - 2;
    if (phase === "event_saved") return progressForStep("saving", "version_saved") - 2;
    if (phase === "version_saved") return progressForStep("saving", "images_saved") - 2;
    if (phase === "images_saved") return progressForStep("saving", "finalizing") - 2;
    return 99;
  }

  const order: BuildProgressStep[] = ["started", "planning", "planned", "generating", "saving", "done"];
  const index = order.indexOf(step);
  const next = order[index + 1];
  return next ? BUILD_PROGRESS[next] - 2 : 99;
}

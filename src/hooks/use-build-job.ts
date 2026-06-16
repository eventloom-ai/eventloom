"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { softProgressCeiling } from "@/lib/agent/build-progress";
import type { BuildJobStatus, BuildProgressStep } from "@/lib/agent/progress";
import { clearStoredBuildJob, readStoredBuildJob, writeStoredBuildJob } from "@/lib/build-job-store";
import type { EventConfig } from "@/lib/types";

export type BuildUiState = {
  jobId: string | null;
  eventId: string | null;
  slug: string | null;
  isBuilding: boolean;
  currentStep: BuildProgressStep;
  statusMessage: string;
  progressPercent: number;
  previewConfig: EventConfig | null;
  error: string;
  completedEventId: string | null;
};

const initialState: BuildUiState = {
  jobId: null,
  eventId: null,
  slug: null,
  isBuilding: false,
  currentStep: "started",
  statusMessage: "Describe your event to begin.",
  progressPercent: 0,
  previewConfig: null,
  error: "",
  completedEventId: null,
};

function applyJobStatus(job: BuildJobStatus, previous?: BuildUiState): BuildUiState {
  const step = job.progressStep ?? previous?.currentStep ?? "started";
  const previewConfig =
    job.status === "succeeded" && job.resultConfig
      ? job.resultConfig
      : job.resultConfig ?? previous?.previewConfig ?? null;

  if (job.status === "failed") {
    return {
      jobId: job.id,
      eventId: job.eventId,
      slug: job.slug,
      isBuilding: false,
      currentStep: "error",
      statusMessage: job.error ?? job.progressMessage ?? "Build failed.",
      progressPercent: job.progressPercent,
      previewConfig,
      error: job.error ?? job.progressMessage ?? "Build failed.",
      completedEventId: null,
    };
  }

  if (job.status === "succeeded") {
    return {
      jobId: job.id,
      eventId: job.eventId,
      slug: job.slug,
      isBuilding: false,
      currentStep: "done",
      statusMessage: job.progressMessage ?? "Your site is ready.",
      progressPercent: 100,
      previewConfig,
      error: "",
      completedEventId: job.eventId,
    };
  }

  return {
    jobId: job.id,
    eventId: job.eventId,
    slug: job.slug,
    isBuilding: true,
    currentStep: step,
    statusMessage: job.progressMessage ?? "Building your site…",
    progressPercent: job.progressPercent,
    previewConfig,
    error: "",
    completedEventId: null,
  };
}

export function useBuildJob() {
  const [state, setState] = useState<BuildUiState>(initialState);
  const pollTimer = useRef<number | null>(null);
  const creepTimer = useRef<number | null>(null);
  const lastServerProgress = useRef(0);
  const activeJobId = useRef<string | null>(null);

  const stopTimers = useCallback(() => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (creepTimer.current) {
      window.clearInterval(creepTimer.current);
      creepTimer.current = null;
    }
  }, []);

  const pollJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/events/build/${jobId}`, { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return null;
    return (await response.json()) as BuildJobStatus;
  }, []);

  const startCreep = useCallback((step: BuildProgressStep, floor: number) => {
    if (creepTimer.current) {
      window.clearInterval(creepTimer.current);
    }

    creepTimer.current = window.setInterval(() => {
      setState((current) => {
        if (!current.isBuilding || current.currentStep !== step) {
          return current;
        }

        const ceiling = softProgressCeiling(step);
        if (current.progressPercent >= ceiling) {
          return current;
        }

        return {
          ...current,
          progressPercent: Math.min(ceiling, current.progressPercent + 1),
        };
      });
    }, 1800);
  }, []);

  const beginPolling = useCallback(
    (jobId: string, slug: string, eventId?: string | null) => {
      stopTimers();
      activeJobId.current = jobId;
      writeStoredBuildJob({ jobId, slug, eventId, startedAt: new Date().toISOString() });

      const tick = async () => {
        const job = await pollJob(jobId);
        if (!job) return;

        lastServerProgress.current = job.progressPercent;
        setState((previous) => applyJobStatus(job, previous));

        if (job.status === "running" && job.progressStep) {
          startCreep(job.progressStep, job.progressPercent);
        }

        if (job.status !== "running") {
          stopTimers();
          if (job.status === "succeeded") {
            clearStoredBuildJob();
          }
        }
      };

      void tick();
      pollTimer.current = window.setInterval(() => {
        void tick();
      }, 1500);
    },
    [pollJob, startCreep, stopTimers],
  );

  const startBuild = useCallback(
    async (body: FormData) => {
      setState((current) => ({
        ...current,
        isBuilding: true,
        error: "",
        completedEventId: null,
        currentStep: "started",
        statusMessage: "Starting your site build…",
        progressPercent: 3,
        previewConfig: null,
      }));

      const response = await fetch("/api/events/build", {
        method: "POST",
        body,
      }).catch(() => null);

      if (!response?.ok) {
        const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
        const message =
          payload?.error === "slug_taken"
            ? "That link name is already taken. Choose another one."
            : payload?.error ?? "We couldn't start the build. Please try again.";
        setState((current) => ({
          ...current,
          isBuilding: false,
          currentStep: "error",
          error: message,
          statusMessage: message,
        }));
        return null;
      }

      const payload = (await response.json()) as { jobId: string; eventId?: string | null; slug: string };
      setState((current) => ({
        ...current,
        jobId: payload.jobId,
        eventId: payload.eventId ?? null,
        slug: payload.slug,
      }));
      beginPolling(payload.jobId, payload.slug, payload.eventId);
      return payload;
    },
    [beginPolling],
  );

  const resumeStoredJob = useCallback(async () => {
    const stored = readStoredBuildJob();
    if (!stored) return false;

    const job = await pollJob(stored.jobId);
    if (!job) {
      clearStoredBuildJob();
      return false;
    }

    if (job.status === "succeeded") {
      setState(applyJobStatus(job));
      clearStoredBuildJob();
      return true;
    }

    if (job.status === "failed") {
      setState(applyJobStatus(job));
      clearStoredBuildJob();
      return true;
    }

    setState(applyJobStatus(job));
    beginPolling(stored.jobId, stored.slug, stored.eventId);
    return true;
  }, [beginPolling, pollJob]);

  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, [stopTimers]);

  return {
    state,
    setState,
    startBuild,
    resumeStoredJob,
    beginPolling,
    pollJob,
    stopTimers,
    lastServerProgress,
  };
}

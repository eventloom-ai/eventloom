import type { EventConfig, EventSiteTemplate } from "@/lib/types";

export type BuildProgressStep =
  | "started"
  | "planning"
  | "planned"
  | "generating"
  | "saving"
  | "done"
  | "error";

export type BuildProgressPhase =
  | "content_ready"
  | "event_saved"
  | "version_saved"
  | "images_saved"
  | "finalizing";

type BuildProgressBase = {
  message: string;
  progressPercent: number;
  jobId?: string;
  eventId?: string | null;
  phase?: BuildProgressPhase;
};

export type BuildProgressEvent =
  | ({ step: "started" } & BuildProgressBase)
  | ({ step: "planning" } & BuildProgressBase)
  | ({
      step: "planned";
      template: EventSiteTemplate;
      config: EventConfig;
    } & BuildProgressBase)
  | ({ step: "generating"; model?: string } & BuildProgressBase)
  | ({ step: "saving" } & BuildProgressBase)
  | ({
      step: "done";
      slug: string;
      previewUrl: string;
      template: EventSiteTemplate;
      config: EventConfig;
    } & BuildProgressBase)
  | ({ step: "error" } & BuildProgressBase);

export type BuildJobStatus = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progressStep: BuildProgressStep | null;
  progressPercent: number;
  progressMessage: string | null;
  slug: string | null;
  eventId: string | null;
  error: string | null;
  resultConfig: EventConfig | null;
  template: EventSiteTemplate | null;
};

export type BuildProgressReporter = (event: BuildProgressEvent) => void | Promise<void>;

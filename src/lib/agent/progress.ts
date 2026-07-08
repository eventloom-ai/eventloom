import type { EventConfig, EventSiteTemplate } from "@/lib/types";

export type BuildProgressStep =
  | "started"
  | "planning"
  | "planned"
  | "generating"
  | "saving"
  | "done"
  | "error";

export type BuildProgressEvent =
  | { step: "started"; message: string }
  | { step: "planning"; message: string }
  | {
      step: "planned";
      message: string;
      template: EventSiteTemplate;
      config: EventConfig;
    }
  | { step: "generating"; message: string; model?: string }
  | { step: "saving"; message: string }
  | {
      step: "done";
      message: string;
      eventId: string;
      slug: string;
      previewUrl: string;
      template: EventSiteTemplate;
      config: EventConfig;
    }
  | { step: "error"; message: string };

export type BuildProgressReporter = (event: BuildProgressEvent) => void | Promise<void>;

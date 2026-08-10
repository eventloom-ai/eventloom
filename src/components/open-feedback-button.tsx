"use client";

import { MessageSquareText } from "lucide-react";
import { requestFeedbackDialog } from "@/lib/feedback";

export function OpenFeedbackButton() {
  return (
    <button
      type="button"
      onClick={() => requestFeedbackDialog()}
      className="eventloom-app-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6153]"
    >
      <MessageSquareText className="size-4" />
      Send a support message
    </button>
  );
}

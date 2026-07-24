"use client";

import { MessageSquareText } from "lucide-react";
import { requestFeedbackDialog } from "@/lib/feedback";

export function OpenFeedbackButton() {
  return (
    <button
      type="button"
      onClick={() => requestFeedbackDialog()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
    >
      <MessageSquareText className="size-4" />
      Send a support message
    </button>
  );
}

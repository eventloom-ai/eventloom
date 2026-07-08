"use client";

import { useEffect } from "react";

const draftKey = "eventloom:new-event-draft";

type SavedEventDraft = {
  prompt?: string;
  slug?: string;
  template?: string;
  savedAt?: number;
};

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function saveEventDraft(draft: Omit<SavedEventDraft, "savedAt">) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    draftKey,
    JSON.stringify({
      ...draft,
      savedAt: Date.now(),
    } satisfies SavedEventDraft),
  );
}

export function EventDraftRestorer() {
  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;

    let draft: SavedEventDraft | null = null;
    try {
      draft = JSON.parse(raw) as SavedEventDraft;
    } catch {
      window.localStorage.removeItem(draftKey);
      return;
    }

    const isFresh = draft.savedAt && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000;
    if (!isFresh) {
      window.localStorage.removeItem(draftKey);
      return;
    }

    window.setTimeout(() => {
      const promptField = document.querySelector<HTMLTextAreaElement>("textarea");
      const slugField = document.querySelector<HTMLInputElement>('input[placeholder="summer-wedding"]');

      if (promptField && draft?.prompt) {
        setInputValue(promptField, draft.prompt);
      }

      if (slugField && draft?.slug) {
        setInputValue(slugField, draft.slug);
      }

      window.localStorage.removeItem(draftKey);
    }, 0);
  }, []);

  return null;
}

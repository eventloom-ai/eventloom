"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewEventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const body = new FormData(form);

    const response = await fetch("/api/events", {
      method: "POST",
      body,
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setError("We couldn't create your event. Please try again.");
      return;
    }

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    if (response.ok) {
      router.push("/app");
      router.refresh();
      return;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(
      payload?.error === "duplicate key value violates unique constraint"
        ? "That link name is already taken. Choose another one."
        : payload?.error?.includes("duplicate key")
          ? "That link name is already taken. Choose another one."
          : payload?.error ?? "We couldn't create your event. Please try again.",
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
    >
      <label className="grid gap-2">
        <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Event description</span>
        <textarea
          name="prompt"
          required
          rows={5}
          disabled={isSubmitting}
          className="resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)] disabled:opacity-60"
          placeholder="A warm summer wedding with RSVP, schedule, and photo gallery..."
        />
      </label>

      <label className="mt-5 grid gap-2">
        <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Link name</span>
        <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 focus-within:border-[#0071e3]/50 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]">
          <span className="shrink-0 text-[15px] text-[#6e6e73]">eventloom.ai/</span>
          <input
            name="slug"
            required
            disabled={isSubmitting}
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#6e6e73]/60 disabled:opacity-60"
            placeholder="summer-wedding"
          />
        </div>
      </label>

      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creating your site…" : "Create first version"}
      </button>
    </form>
  );
}

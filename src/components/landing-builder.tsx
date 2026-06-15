"use client";

import { ImagePlus, X } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

export const examplePrompts = [
  {
    id: "wedding",
    label: "Wedding",
    prompt:
      "A luxury bilingual wedding site with guest replies, separate men's and women's hall details, and a soft blush design.",
  },
  {
    id: "birthday",
    label: "Birthday",
    prompt: "A modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.",
  },
  {
    id: "engagement",
    label: "Engagement",
    prompt:
      "An elegant engagement site with family wording, Arabic and English text, schedule, location details, and guest replies.",
  },
] as const;

function templateDefaults(template?: string) {
  const example = examplePrompts.find((item) => item.id === template);
  return {
    prompt: example?.prompt ?? "",
    activeExample: example?.label ?? null,
  };
}

export function LandingBuilder({ initialTemplate }: { initialTemplate?: string }) {
  const defaults = useMemo(() => templateDefaults(initialTemplate), [initialTemplate]);
  const [prompt, setPrompt] = useState(defaults.prompt);
  const [activeExample, setActiveExample] = useState<string | null>(defaults.activeExample);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slug = useMemo(() => makeSlug(prompt), [prompt]);

  function selectExample(example: (typeof examplePrompts)[number]) {
    setPrompt(example.prompt);
    setActiveExample(example.label);
    setError("");
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...nextFiles].slice(0, 8));
    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    const body = new FormData();
    body.set("prompt", prompt);
    body.set("slug", slug);
    if (initialTemplate === "wedding") {
      body.set("template", "wedding");
    }
    files.forEach((file) => body.append("images", file));

    const response = await fetch("/api/events", {
      method: "POST",
      body,
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setError("We couldn't start your page. Please try again.");
      return;
    }

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    if (response.ok) {
      window.location.href = "/app";
      return;
    }

    setError("We couldn't start your page. Please try again.");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-black/[0.08] bg-[#fbfbfd] p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
    >
      <label className="grid gap-2">
        <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Your event</span>
        <textarea
          name="prompt"
          required
          rows={5}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setActiveExample(null);
            setError("");
          }}
          className="resize-none rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 text-[17px] leading-relaxed text-[#1d1d1f] outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
          placeholder="e.g. A warm summer wedding with RSVP, schedule, and photo gallery..."
        />
      </label>

      {prompt.trim() ? (
        <p className="mt-3 text-[13px] text-[#6e6e73]">
          Your link preview:{" "}
          <span className="font-medium text-[#1d1d1f]">eventloom.ai/{slug}</span>
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-[13px] font-medium text-[#6e6e73]">Quick start</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {examplePrompts.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => selectExample(example)}
              className={`rounded-full px-4 py-2 text-[14px] font-medium transition-all active:scale-[0.98] ${
                activeExample === example.label
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-white text-[#1d1d1f] ring-1 ring-black/[0.08] hover:bg-[#f5f5f7]"
              }`}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-black/[0.12] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-medium">Photos</p>
            <p className="mt-1 text-[13px] text-[#6e6e73]">Optional — invitations, portraits, or mood images.</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#ebebed]"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
            Add photos
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={selectFiles} className="hidden" />

        {files.length ? (
          <ul className="mt-4 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#f5f5f7] px-3 py-2 text-[13px]"
              >
                <span className="min-w-0 truncate text-[#1d1d1f]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.06] hover:text-[#1d1d1f]"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!prompt.trim() || isSubmitting}
        className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? "Creating…" : "Create my site"}
      </button>
    </form>
  );
}

function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
    .replace(/-+$/g, "");

  return slug && slug.length >= 3 ? slug : `event-${Date.now().toString(36)}`;
}

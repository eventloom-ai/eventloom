"use client";

import { ImagePlus, Sparkles, X } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

const examples = [
  "Create a luxury bilingual wedding website with guest replies, separate men's and women's hall details, and a soft blush design.",
  "Create a modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.",
  "Create an elegant engagement website with family wording, Arabic and English text, schedule, location details, and guest replies.",
];

export function LandingBuilder() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slug = useMemo(() => makeSlug(prompt), [prompt]);

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
    files.forEach((file) => body.append("images", file));

    const response = await fetch("/api/events", {
      method: "POST",
      body,
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setError("We could not start your page. Please try again.");
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

    setError("We could not start your page. Please try again.");
  }

  return (
    <section id="start" className="rounded-[8px] border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(25,23,19,0.12)]">
      <form onSubmit={submit} className="grid gap-4">
        <div className="rounded-[6px] bg-[#191713] p-5 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d7bd8d]" />
            <p className="text-xs uppercase tracking-[0.22em] text-[#d7bd8d]">Start with a message</p>
          </div>
          <label className="mt-5 grid gap-3">
            <span className="text-sm text-white/70">Tell Eventloom what to make.</span>
            <textarea
              name="prompt"
              required
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-44 resize-none rounded-[6px] border border-white/15 bg-white/10 p-4 text-lg leading-8 text-white outline-none placeholder:text-white/40 focus:border-[#d7bd8d]/60"
              placeholder="Create a luxury wedding website with guest replies, schedule, photos, and a personal website address..."
            />
          </label>
        </div>

        <div className="rounded-[6px] bg-[#f7f4ee] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Add images</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">Invitation cards, couple photos, mood images, or anything you want the page to match.</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-3 text-sm font-semibold"
            >
              <ImagePlus className="h-4 w-4" />
              Choose images
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={selectFiles} className="hidden" />

          {files.length ? (
            <div className="mt-4 grid gap-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-[6px] bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(index)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label={`Remove ${file.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-semibold">Examples</p>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-[6px] border border-black/10 bg-[#f7f4ee] p-3 text-left text-sm leading-6 transition hover:bg-[#efe7d8]"
            >
              {example}
            </button>
          ))}
        </div>

        {error ? <p className="rounded-[6px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button disabled={!prompt.trim() || isSubmitting} className="rounded-full bg-[#405448] px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? "Starting..." : "Create my first version"}
        </button>
      </form>
    </section>
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

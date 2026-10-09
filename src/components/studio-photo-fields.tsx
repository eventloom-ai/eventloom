"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { CustomField } from "@puckeditor/core";
import { creatorErrorMessage } from "@/lib/creator-errors";

/**
 * Photo upload, replace, remove and reorder for the studio. Files go through /api/events/<id>/assets (resized to
 * WebP and stored; demo mode keeps them in memory) and come back as /api/assets/<id> URLs.
 */

export type StudioPhoto = { url: string; alt: string };

export const STUDIO_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Same limit as the upload route (event-assets.ts). */
export const MAX_STUDIO_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPT = STUDIO_PHOTO_TYPES.join(",");

/** Why a file can't be uploaded, checked before sending it; null when it can. */
export function photoFileProblem(file: Pick<File, "type" | "size">) {
  if (!(STUDIO_PHOTO_TYPES as readonly string[]).includes(file.type)) return file.type === "image/gif" ? "GIFs aren’t supported. Use a JPEG, PNG or WebP photo." : "Use a JPEG, PNG or WebP photo.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_STUDIO_PHOTO_BYTES) return "That photo is larger than 10 MB. Use a smaller copy.";
  return null;
}

let uploadsInFlight = 0;
/** Whether a photo is uploading; the studio holds canvas rebuilds until it lands so the upload isn't lost. */
export const photoUploadsInFlight = () => uploadsInFlight > 0;
const holdUploads = () => { uploadsInFlight += 1; };
const releaseUploads = () => { uploadsInFlight = Math.max(0, uploadsInFlight - 1); };

/** Uploads one photo, reporting progress from 0 to 1. Resolves with the stored URL or a message for the host. */
export function uploadEventPhoto(eventId: string, file: File, onProgress?: (fraction: number) => void): Promise<{ url: string } | { error: string }> {
  const problem = photoFileProblem(file);
  if (problem) return Promise.resolve({ error: problem });
  holdUploads();
  return new Promise<{ url: string } | { error: string }>((resolve) => {
    // Count the upload as landed before the caller sees the result, so its own change can rebuild the canvas.
    const finish = (result: { url: string } | { error: string }) => {
      releaseUploads();
      resolve(result);
    };
    const request = new XMLHttpRequest();
    request.open("POST", `/api/events/${encodeURIComponent(eventId)}/assets`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
    };
    request.onload = () => {
      const payload = (request.response ?? null) as { url?: string; error?: string; retryAfterSeconds?: number } | null;
      if (request.status >= 200 && request.status < 300 && payload?.url) finish({ url: payload.url });
      else finish({ error: creatorErrorMessage(payload?.error ?? (request.status === 413 ? "invalid_image" : "upload_failed"), "We couldn’t upload that photo.", payload?.retryAfterSeconds) });
    };
    request.onerror = () => finish({ error: creatorErrorMessage("network_error") });
    request.onabort = () => finish({ error: creatorErrorMessage("network_error") });
    const form = new FormData();
    form.set("image", file);
    request.send(form);
  });
}

type UploadState = { label: string; fraction: number } | null;

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

const buttonClass = "inline-flex items-center gap-1 rounded-md border border-black/15 bg-white px-2 py-1 text-[11px] font-medium text-[#1c1917] hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-45";
const inputClass = "w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-[12px] text-[#1c1917] outline-none focus:border-[#155166] disabled:opacity-60";

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-[#1c1917]">{children}</label>;
}

function Progress({ state }: { state: UploadState }) {
  if (!state) return null;
  const percent = Math.round(state.fraction * 100);
  return (
    <div className="mt-2" role="status" aria-live="polite">
      <div className="flex items-center gap-1.5 text-[11px] text-[#57534e]"><Loader2 className="size-3 animate-spin" aria-hidden="true" />{state.label} · {percent}%</div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-[#155166] transition-[width]" style={{ width: `${Math.max(4, percent)}%` }} /></div>
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-2 text-[11px] leading-4 text-red-700">{message}</p> : null;
}

function Thumb({ url, alt }: { url: string; alt: string }) {
  return (
    <span className="relative block size-14 shrink-0 overflow-hidden rounded-md border border-black/10 bg-black/5">
      <Image src={url} alt={alt} fill unoptimized sizes="56px" className="object-cover" />
    </span>
  );
}

function FilePicker({ label, multiple = false, disabled, onFiles, children }: { label: string; multiple?: boolean; disabled?: boolean; onFiles: (files: File[]) => void; children: ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={buttonClass} disabled={disabled} onClick={() => inputRef.current?.click()} aria-label={label}>{children}</button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        hidden
        disabled={disabled}
        data-photo-input={label}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

type SinglePhotoProps = { eventId: string; label: string; value: StudioPhoto | null; onChange: (value: StudioPhoto | null) => void; readOnly?: boolean; withAlt?: boolean; hint?: string };

/** One photo slot (the cover photo, a legacy image block): upload, replace, remove, describe. */
export function SinglePhotoField({ eventId, label, value, onChange, readOnly, withAlt = true, hint }: SinglePhotoProps) {
  const altId = useId();
  const [upload, setUpload] = useState<UploadState>(null);
  const [error, setError] = useState("");
  const latestRef = useLatest(value);

  async function choose([file]: File[]) {
    setError("");
    setUpload({ label: `Uploading ${file.name}`, fraction: 0 });
    const result = await uploadEventPhoto(eventId, file, (fraction) => setUpload({ label: `Uploading ${file.name}`, fraction }));
    setUpload(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onChange({ url: result.url, alt: latestRef.current?.alt ?? "" });
  }

  const busy = Boolean(upload) || readOnly;
  return (
    <div data-photo-field={label}>
      <FieldLabel>{label}</FieldLabel>
      {value?.url ? (
        <div className="flex gap-2.5">
          <Thumb url={value.url} alt={value.alt || label} />
          <div className="min-w-0 flex-1">
            {withAlt ? <input id={altId} className={inputClass} value={value.alt} disabled={readOnly} maxLength={300} placeholder="Describe the photo for screen readers" aria-label={`${label} description`} onChange={(event) => onChange({ ...value, alt: event.target.value })} /> : null}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <FilePicker label={`Replace ${label.toLowerCase()}`} disabled={busy} onFiles={choose}><RefreshCw className="size-3" aria-hidden="true" />Replace</FilePicker>
              <button type="button" className={buttonClass} disabled={busy} onClick={() => onChange(null)} aria-label={`Remove ${label.toLowerCase()}`}><Trash2 className="size-3" aria-hidden="true" />Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <FilePicker label={`Upload ${label.toLowerCase()}`} disabled={busy} onFiles={choose}><ImagePlus className="size-3.5" aria-hidden="true" />Upload a photo</FilePicker>
      )}
      <Progress state={upload} />
      <ErrorText message={error} />
      {hint ? <p className="mt-1.5 text-[11px] leading-4 text-[#78716c]">{hint}</p> : null}
    </div>
  );
}

type PhotoListProps = { eventId: string; label: string; value: StudioPhoto[]; onChange: (value: StudioPhoto[]) => void; readOnly?: boolean; max: number; hint?: string };

/** An ordered list of photos (the gallery): add several at once, replace, remove, move, describe. */
export function PhotoListField({ eventId, label, value, onChange, readOnly, max, hint }: PhotoListProps) {
  const photos = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [upload, setUpload] = useState<UploadState>(null);
  const [error, setError] = useState("");
  const latestRef = useRef(photos);
  useEffect(() => { latestRef.current = photos; }, [photos]);
  const update = (next: StudioPhoto[]) => {
    latestRef.current = next;
    onChange(next);
  };

  async function add(files: File[]) {
    setError("");
    const room = max - latestRef.current.length;
    const queue = files.slice(0, Math.max(0, room));
    const problems: string[] = files.length > queue.length ? [`Only ${max} photos fit here; ${files.length - queue.length} weren’t added.`] : [];
    const added: StudioPhoto[] = [];
    // The batch lands as one change once every file is up, so a canvas rebuild can't drop the later ones.
    holdUploads();
    try {
      for (const [index, file] of queue.entries()) {
        const text = queue.length > 1 ? `Uploading ${index + 1} of ${queue.length}` : `Uploading ${file.name}`;
        setUpload({ label: text, fraction: 0 });
        const result = await uploadEventPhoto(eventId, file, (fraction) => setUpload({ label: text, fraction }));
        if ("error" in result) problems.push(`${file.name}: ${result.error}`);
        else added.push({ url: result.url, alt: "" });
      }
    } finally {
      releaseUploads();
    }
    setUpload(null);
    setError(problems.join(" "));
    if (added.length) update([...latestRef.current, ...added]);
  }

  async function replace(index: number, [file]: File[]) {
    setError("");
    setUpload({ label: `Replacing photo ${index + 1}`, fraction: 0 });
    const result = await uploadEventPhoto(eventId, file, (fraction) => setUpload({ label: `Replacing photo ${index + 1}`, fraction }));
    setUpload(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    update(latestRef.current.map((photo, position) => position === index ? { ...photo, url: result.url } : photo));
  }

  const move = (index: number, by: number) => {
    const next = [...photos];
    const [photo] = next.splice(index, 1);
    next.splice(index + by, 0, photo);
    update(next);
  };

  const busy = Boolean(upload) || readOnly;
  return (
    <div data-photo-field={label}>
      <FieldLabel>{label}</FieldLabel>
      {photos.length ? (
        <ol className="grid gap-2">
          {photos.map((photo, index) => (
            <li key={`${photo.url}-${index}`} className="flex gap-2.5 rounded-md border border-black/10 bg-white p-1.5">
              <Thumb url={photo.url} alt={photo.alt || `Photo ${index + 1}`} />
              <div className="min-w-0 flex-1">
                <input className={inputClass} value={photo.alt} disabled={readOnly} maxLength={300} placeholder="Describe the photo" aria-label={`Photo ${index + 1} description`} onChange={(event) => update(photos.map((item, position) => position === index ? { ...item, alt: event.target.value } : item))} />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button type="button" className={buttonClass} disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} up`}><ArrowUp className="size-3" aria-hidden="true" /></button>
                  <button type="button" className={buttonClass} disabled={busy || index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} down`}><ArrowDown className="size-3" aria-hidden="true" /></button>
                  <FilePicker label={`Replace photo ${index + 1}`} disabled={busy} onFiles={(files) => replace(index, files)}><RefreshCw className="size-3" aria-hidden="true" />Replace</FilePicker>
                  <button type="button" className={buttonClass} disabled={busy} onClick={() => update(photos.filter((_, position) => position !== index))} aria-label={`Remove photo ${index + 1}`}><Trash2 className="size-3" aria-hidden="true" />Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      <div className={photos.length ? "mt-2" : ""}>
        <FilePicker label={`Add ${label.toLowerCase()}`} multiple disabled={busy || photos.length >= max} onFiles={add}><ImagePlus className="size-3.5" aria-hidden="true" />{photos.length ? "Add photos" : "Upload photos"}</FilePicker>
      </div>
      <Progress state={upload} />
      <ErrorText message={error} />
      <p className="mt-1.5 text-[11px] leading-4 text-[#78716c]">{hint ? `${hint} ` : ""}JPEG, PNG or WebP, up to 10 MB each.</p>
    </div>
  );
}

/* Puck adapters ---------------------------------------------------------------------------------------------------- */

/** The cover photo on a designed page's root (value: { url, alt } or null). */
export function coverPhotoPuckField(eventId: string): CustomField<StudioPhoto | null> {
  return {
    type: "custom",
    label: "Cover photo",
    render: ({ value, onChange, readOnly }) => <SinglePhotoField eventId={eventId} label="Cover photo" value={value?.url ? value : null} onChange={onChange} readOnly={readOnly} hint="Shown in the opening section and on link previews." />,
  };
}

/** The gallery photos on a designed page's root. */
export function galleryPhotosPuckField(eventId: string, max: number): CustomField<StudioPhoto[]> {
  return {
    type: "custom",
    label: "Gallery photos",
    render: ({ value, onChange, readOnly }) => <PhotoListField eventId={eventId} label="Gallery photos" value={value ?? []} onChange={onChange} readOnly={readOnly} max={max} hint="The gallery appears once there are three or more. Without a cover photo, the first one opens the page." />,
  };
}

/** A legacy image block's URL (its description has its own field). */
export function imageUrlPuckField(eventId: string): CustomField<string> {
  return {
    type: "custom",
    label: "Image",
    render: ({ value, onChange, readOnly }) => <SinglePhotoField eventId={eventId} label="Image" withAlt={false} value={value ? { url: value, alt: "" } : null} onChange={(next) => onChange(next?.url ?? "")} readOnly={readOnly} />,
  };
}

type LegacyGalleryImage = { id: string; url: string; alt: string };

/** A legacy gallery block's images, keeping each image's stable id. */
export function legacyGalleryPuckField(eventId: string, max: number): CustomField<LegacyGalleryImage[]> {
  return {
    type: "custom",
    label: "Photos",
    render: ({ value, onChange, readOnly }) => {
      const images = (Array.isArray(value) ? value : []).filter((image) => image?.url);
      return (
        <PhotoListField
          eventId={eventId}
          label="Photos"
          max={max}
          readOnly={readOnly}
          value={images.map((image) => ({ url: image.url, alt: image.alt ?? "" }))}
          onChange={(next) => onChange(next.map((photo, index) => {
            const kept = images.find((image) => image.url === photo.url);
            return { id: kept?.id ?? `gallery_${crypto.randomUUID().slice(0, 8)}_${index}`, url: photo.url, alt: photo.alt };
          }))}
        />
      );
    },
  };
}

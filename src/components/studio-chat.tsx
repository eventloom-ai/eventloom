"use client";

import { ArrowUp, ImagePlus, Loader2, MousePointer2, Square, WandSparkles, X } from "lucide-react";
import { ChangeEvent, FormEvent, useRef } from "react";
import type { BuilderMessage } from "@/lib/types";

type StudioChatProps = {
  messages: BuilderMessage[];
  value: string;
  selectedLabel?: string | null;
  isRunning: boolean;
  activity: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onClearSelection: () => void;
  onAttachment: (file: File) => void;
  attachmentName?: string | null;
  uploadingAttachment?: boolean;
  hideComposer?: boolean;
};

const suggestions = ["Make it feel more editorial", "Use a warmer palette", "Give the hero more impact"];

export function StudioChat({ messages, value, selectedLabel, isRunning, activity, error, onChange, onSubmit, onStop, onClearSelection, onAttachment, attachmentName, uploadingAttachment, hideComposer }: StudioChatProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  function submit(event: FormEvent) { event.preventDefault(); if (value.trim() && !isRunning) onSubmit(); }
  function attach(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (file) onAttachment(file); }
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-white/10 bg-[#171717] text-white">
      <div className="border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-[12px] font-semibold"><WandSparkles className="size-4 text-violet-300" /> Eventloom agent</div><p className="mt-1 text-[10px] leading-4 text-white/40">Ask for a change or select something on the canvas first.</p></div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4"><p className="text-[12px] font-medium">Your site is ready to shape.</p><p className="mt-1 text-[11px] leading-5 text-white/45">Try a visual direction, rewrite a section, or select an element for a precise edit.</p></div> : null}
        {messages.map((message) => { const [content, reference] = message.content.split("\n\nReference image URL: "); return <div key={message.id} className={message.role === "user" ? "ml-8 rounded-xl bg-[#293a58] px-3 py-2.5 text-[12px] leading-5 text-blue-50" : "mr-3 text-[12px] leading-5 text-white/75"}>{content}{reference ? <span className="mt-2 flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[10px]"><ImagePlus className="size-3" /> Reference image attached</span> : null}{message.status === "pending" ? <Loader2 className="ml-2 inline size-3 animate-spin" /> : null}</div>; })}
        {isRunning ? <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.07] px-3 py-2.5 text-[11px] text-violet-100"><Loader2 className="mr-2 inline size-3.5 animate-spin text-violet-300" />{activity || "Working on your site…"}</div> : null}
        {error ? <p className="rounded-xl bg-red-400/10 px-3 py-2.5 text-[11px] leading-5 text-red-200" role="alert">{error}</p> : null}
      </div>
      {!hideComposer ? <div className="shrink-0 border-t border-white/10 p-3">
        {!messages.length && !isRunning ? <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { onChange(suggestion); textareaRef.current?.focus(); }} className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/55 hover:bg-white/10 hover:text-white">{suggestion}</button>)}</div> : null}
        {selectedLabel ? <div className="mb-2 flex items-center gap-2 rounded-lg bg-violet-400/10 px-2.5 py-1.5 text-[10px] text-violet-200"><MousePointer2 className="size-3" /><span className="min-w-0 flex-1 truncate">Editing: {selectedLabel}</span><button type="button" onClick={onClearSelection} aria-label="Clear selection"><X className="size-3" /></button></div> : null}
        <form onSubmit={submit} className="rounded-xl border border-white/10 bg-[#202020] p-1 focus-within:border-violet-400/50">
          <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (value.trim() && !isRunning) onSubmit(); } }} rows={3} maxLength={8000} placeholder="Describe the change you want…" className="w-full resize-none bg-transparent px-2.5 py-2 text-[12px] leading-5 text-white outline-none placeholder:text-white/30" />
          {attachmentName ? <div className="mx-1 mb-1 flex items-center gap-1.5 rounded-md bg-violet-400/10 px-2 py-1 text-[10px] text-violet-200"><ImagePlus className="size-3" /><span className="truncate">{attachmentName}</span></div> : null}
          <div className="flex items-center justify-between border-t border-white/[0.07] px-1.5 pt-1.5"><label className={`grid size-7 cursor-pointer place-items-center rounded-md ${uploadingAttachment ? "text-violet-300" : "text-white/45 hover:text-white"}`} aria-label="Add reference image">{uploadingAttachment ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isRunning || uploadingAttachment} onChange={attach} className="hidden" /></label>{isRunning ? <button type="button" onClick={onStop} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-black"><Square className="size-3 fill-current" /> Stop</button> : <button type="submit" disabled={!value.trim() || uploadingAttachment} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-35"><ArrowUp className="size-3.5" /> Send</button>}</div>
        </form>
        <p className="mt-2 text-center text-[9px] text-white/25">AI edits use build credit. Direct edits are free.</p>
      </div> : null}
    </aside>
  );
}

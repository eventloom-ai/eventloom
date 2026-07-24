"use client";

import { Eye, EyeOff, ImagePlus, Palette, SlidersHorizontal, Type } from "lucide-react";
import { ChangeEvent, useState } from "react";
import type { SiteNode, SiteStyle } from "@/lib/site-document";
import type { SiteOperation } from "@/lib/site-document-operations";
import type { EventConfig } from "@/lib/types";

type StudioInspectorProps = {
  eventId: string;
  node: SiteNode | null;
  config: EventConfig;
  disabled: boolean;
  onOperations: (operations: SiteOperation[], summary: string) => void;
  onEventPatch: (patch: Partial<EventConfig>, summary: string) => void;
};

const selectClass = "w-full rounded-lg border border-white/10 bg-[#111] px-2.5 py-2 text-[11px] text-white outline-none focus:border-violet-400/50";
const inputClass = "w-full rounded-lg border border-white/10 bg-[#111] px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-violet-400/50";

export function StudioInspector({ eventId, node, config, disabled, onOperations, onEventPatch }: StudioInspectorProps) {
  const [tab, setTab] = useState<"content" | "style" | "details">(node ? "content" : "details");
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !node || node.type !== "image") return;
    const form = new FormData(); form.set("image", file);
    const response = await fetch(`/api/events/${eventId}/assets`, { method: "POST", body: form });
    const payload = await response.json().catch(() => null) as { url?: string } | null;
    if (response.ok && payload?.url) onOperations([{ op: "set_image", nodeId: node.id, url: payload.url, alt: node.alt }], "Replaced an image");
  }
  function style(key: keyof SiteStyle, value: string | boolean | null) {
    if (!node) return;
    onOperations([{ op: "update_style", nodeId: node.id, style: { [key]: value } } as SiteOperation], `Updated ${node.label ?? node.type} style`);
  }
  const boundText = node?.type === "text" && node.binding ? ({
    "event.title": config.title,
    "event.subtitle": config.subtitle,
    "event.date": config.date,
    "event.venueName": config.venueName,
    "event.venueAddress": config.venueAddress ?? "",
  } as const)[node.binding] : "";
  const textValue = node?.type === "text" ? node.content ?? boundText : "";
  const tabLabels = { content: "Text", style: "Design", details: "Event" } as const;
  const rsvpLabels = {
    name: "Name",
    attendance: "Attending?",
    party_size: "Party size",
    guest_names: "Guest names",
    email: "Email",
    phone: "Phone",
    meal_preference: "Meal choice",
    note: "Message",
  } as const;
  return (
    <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[#171717] text-white">
      <div className="grid grid-cols-3 border-b border-white/10 p-1.5">{(["content", "style", "details"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-md px-2 py-2 text-[10px] font-medium ${tab === item ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>{tabLabels[item]}</button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "content" ? <div><div className="mb-4 flex items-center gap-2"><Type className="size-4 text-violet-300" /><div><p className="text-[12px] font-semibold">{node?.label ?? node?.type ?? "Nothing selected"}</p><p className="text-[10px] text-white/35">{node ? "Selected on your page preview." : "Click something on the preview to edit it."}</p></div></div>
          {node?.type === "text" ? <label className="grid gap-1.5 text-[10px] text-white/50">Text<textarea key={`${node.id}-${textValue}`} defaultValue={textValue} disabled={disabled} rows={5} onBlur={(event) => { if (event.target.value !== textValue) onOperations([{ op: "replace_text", nodeId: node.id, content: event.target.value }], "Updated text"); }} className={`${inputClass} resize-none`} /></label> : null}
          {node?.type === "image" ? <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 p-5 text-[11px] text-white/55 hover:bg-white/[0.04]"><ImagePlus className="size-4" /> Replace image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled} onChange={uploadImage} className="hidden" /></label> : null}
          {node?.type === "rsvp" ? <p className="rounded-xl bg-violet-400/10 p-3 text-[11px] leading-5 text-violet-100">The RSVP form is securely managed by Eventloom. You can move and style this section, while its submission behavior stays protected.</p> : null}
          {!node ? <p className="text-[11px] leading-5 text-white/40">Choose a heading, image, section, schedule, venue, or RSVP block to edit it directly.</p> : null}
        </div> : null}
        {tab === "style" ? <div className="space-y-4"><div className="flex items-center gap-2"><Palette className="size-4 text-violet-300" /><p className="text-[12px] font-semibold">Style</p></div>{node ? <>
          <label className="grid gap-1.5 text-[10px] text-white/50">Alignment<select value={node.style?.align ?? "left"} disabled={disabled} onChange={(event) => style("align", event.target.value)} className={selectClass}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <label className="grid gap-1.5 text-[10px] text-white/50">Size<select value={node.style?.size ?? "md"} disabled={disabled} onChange={(event) => style("size", event.target.value)} className={selectClass}>{["xs", "sm", "md", "lg", "xl", "hero"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="grid gap-1.5 text-[10px] text-white/50">Spacing<select value={node.style?.padding ?? "none"} disabled={disabled} onChange={(event) => style("padding", event.target.value)} className={selectClass}>{["none", "small", "medium", "large", "hero"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="grid gap-1.5 text-[10px] text-white/50">Background<input type="color" value={node.style?.background?.startsWith("#") ? node.style.background : "#ffffff"} disabled={disabled} onChange={(event) => style("background", event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-[#111] p-1" /></label><label className="grid gap-1.5 text-[10px] text-white/50">Text color<input type="color" value={node.style?.color?.startsWith("#") ? node.style.color : "#111111"} disabled={disabled} onChange={(event) => style("color", event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-[#111] p-1" /></label></div>
          <button type="button" disabled={disabled} onClick={() => style("hidden", !node.style?.hidden)} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2.5 text-[11px] text-white/65 hover:bg-white/[0.05]"><span className="flex items-center gap-2">{node.style?.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} Visibility</span><span>{node.style?.hidden ? "Hidden" : "Visible"}</span></button>
        </> : <p className="text-[11px] text-white/40">Select an element to adjust its style.</p>}</div> : null}
        {tab === "details" ? <div className="space-y-4"><div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-violet-300" /><p className="text-[12px] font-semibold">Event details</p></div>{([
          ["title", "Event title", config.title], ["subtitle", "Introduction", config.subtitle], ["date", "Date and time", config.date], ["venueName", "Venue", config.venueName], ["venueAddress", "Venue address", config.venueAddress ?? ""], ["rsvpDeadline", "RSVP deadline", config.rsvpDeadline ?? ""],
        ] as const).map(([key, label, value]) => <label key={key} className="grid gap-1.5 text-[10px] text-white/50">{label}<input key={`${key}-${value}`} defaultValue={value} disabled={disabled} onBlur={(event) => { if (event.target.value !== value) onEventPatch({ [key]: event.target.value }, `Updated ${label.toLowerCase()}`); }} className={inputClass} /></label>)}
          <label className="grid gap-1.5 text-[10px] text-white/50">Schedule <span className="text-[9px] text-white/30">One item per line: time | title | location</span><textarea key={JSON.stringify(config.schedule)} defaultValue={config.schedule.map((item) => [item.time, item.title, item.location ?? ""].join(" | ")).join("\n")} disabled={disabled} rows={6} onBlur={(event) => { const schedule = event.target.value.split("\n").flatMap((line) => { const [time, title, location] = line.split("|").map((part) => part.trim()); return time && title ? [{ time, title, ...(location ? { location } : {}) }] : []; }); if (JSON.stringify(schedule) !== JSON.stringify(config.schedule)) onEventPatch({ schedule }, "Updated event schedule"); }} className={`${inputClass} resize-none`} /></label>
          <fieldset className="grid grid-cols-2 gap-2"><legend className="col-span-2 mb-1 text-[10px] text-white/50">Questions for guests</legend>{(["name", "attendance", "party_size", "guest_names", "email", "phone", "meal_preference", "note"] as const).map((field) => <label key={field} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-[9px] text-white/55"><input type="checkbox" checked={config.rsvpFields.includes(field)} disabled={disabled || field === "name" || field === "attendance"} onChange={(event) => { const fields = event.target.checked ? [...config.rsvpFields, field] : config.rsvpFields.filter((value) => value !== field); onEventPatch({ rsvpFields: fields }, "Updated guest questions"); }} />{rsvpLabels[field]}</label>)}</fieldset>
        </div> : null}
      </div>
    </aside>
  );
}

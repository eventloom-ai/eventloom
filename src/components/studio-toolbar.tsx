"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, Code2, Eye, Globe2, History, Laptop, Loader2, Redo2, Rocket, Smartphone, Tablet, Undo2, X } from "lucide-react";
import Link from "next/link";

type StudioToolbarProps = {
  eventId: string;
  title: string;
  status: string;
  saveStatus: "saved" | "saving" | "error";
  viewport: "desktop" | "tablet" | "mobile";
  canUndo: boolean;
  canRedo: boolean;
  onViewport: (viewport: "desktop" | "tablet" | "mobile") => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHistory: () => void;
  onToggleCode: () => void;
};

export function StudioToolbar({ eventId, title, status, saveStatus, viewport, canUndo, canRedo, onViewport, onUndo, onRedo, onToggleHistory, onToggleCode }: StudioToolbarProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainQuote, setDomainQuote] = useState<{ domain: string; included: boolean; registrationCost: number; renewalCost: number; currency: string } | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [registrant, setRegistrant] = useState({ firstName: "", lastName: "", organization: "", email: "", phone: "", address1: "", address2: "", city: "", state: "", postalCode: "", country: "CA" });
  const [domainTermsAccepted, setDomainTermsAccepted] = useState(false);
  const [launchTermsAccepted, setLaunchTermsAccepted] = useState(false);

  async function publish(requestedDomain?: string | null) {
    if (publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/publish`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ domain: requestedDomain || null, registrant: requestedDomain ? registrant : undefined, legalAccepted: launchTermsAccepted && (!requestedDomain || domainTermsAccepted), legalVersion: "2026-07-22-beta" }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; checkout_url?: string } | null;
      if (!response.ok) {
        setPublishError(payload?.error === "publish_failed" ? "Publish failed. Your draft is still safe." : payload?.error ?? "Publish could not start.");
        return;
      }
      if (payload?.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }
      window.location.reload();
    } catch {
      setPublishError("Publish could not start. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function checkDomain() {
    const normalized = domain.trim().toLowerCase();
    if (!normalized) return;
    setCheckingDomain(true);
    setDomainError(null);
    setDomainQuote(null);
    try {
      const response = await fetch("/api/domains/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: [normalized] }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        quotes?: Array<{ domain: string; included: boolean; registrationCost: number; renewalCost: number; currency: string; available: boolean; premium: boolean }>;
      } | null;
      const quote = payload?.quotes?.find((item) => item.domain === normalized);
      if (!response.ok || !quote) {
        setDomainError(payload?.error ?? "The domain could not be checked.");
      } else if (!quote.included) {
        setDomainError(!quote.available ? "That domain is no longer available." : quote.premium ? "Premium domains are not supported." : "That domain costs more than the included domain allowance.");
      } else {
        setDomainQuote(quote);
      }
    } catch {
      setDomainError("The domain could not be checked. Try again.");
    } finally {
      setCheckingDomain(false);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#151515] px-3 text-white sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/app" aria-label="Back to my events" className="grid size-8 shrink-0 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"><ChevronLeft className="size-4" /></Link>
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{title}</p><p className="text-[10px] text-white/45">{status} · {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "All changes saved"}</p></div>
      </div>

      <div className="hidden items-center rounded-lg border border-white/10 bg-black/20 p-1 md:flex">
        {(["desktop", "tablet", "mobile"] as const).map((item) => {
          const Icon = item === "desktop" ? Laptop : item === "tablet" ? Tablet : Smartphone;
          return <button key={item} type="button" onClick={() => onViewport(item)} aria-label={`${item} preview`} aria-pressed={viewport === item} className={`grid size-7 place-items-center rounded-md transition ${viewport === item ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><Icon className="size-3.5" /></button>;
        })}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Undo2 className="size-3.5" /></button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Redo2 className="size-3.5" /></button>
        <button type="button" onClick={onToggleHistory} aria-label="Version history" className="hidden size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white sm:grid"><History className="size-3.5" /></button>
        <button type="button" onClick={onToggleCode} aria-label="Inspect generated source" className="hidden size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white sm:grid"><Code2 className="size-3.5" /></button>
        <Link href={`/app/events/${eventId}/preview`} target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 sm:inline-flex"><Eye className="size-3.5" /> Preview</Link>
        <Link href={`/app/events/${eventId}/privacy`} className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 lg:inline-flex">Privacy</Link>
        <form action={`/api/events/${eventId}/publish`} method="post" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLaunchOpen(true); setPublishError(null); }} className="relative">
          <button type="submit" onClick={(event) => { event.preventDefault(); setLaunchOpen(true); setPublishError(null); }} disabled={publishing} aria-busy={publishing} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-70"><Rocket className="size-3.5" /> {publishing ? "Publishing…" : "Publish"}</button>
          {publishError ? <p role="alert" className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-red-400/30 bg-[#251719] px-3 py-2 text-[11px] leading-4 text-red-100 shadow-xl">{publishError}</p> : null}
          {launchOpen ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="launch-title" onMouseDown={(event) => { if (event.currentTarget === event.target && !publishing) setLaunchOpen(false); }}>
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-5 text-left shadow-2xl">
              <div className="flex items-start justify-between gap-4"><div><p id="launch-title" className="text-base font-semibold">Launch your event site</p><p className="mt-1 text-[11px] leading-5 text-white/50">Publish for one year. Choose the included Eventloom address or register an available custom domain.</p></div><button type="button" onClick={() => setLaunchOpen(false)} disabled={publishing} aria-label="Close launch options" className="grid size-8 shrink-0 place-items-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"><X className="size-4" /></button></div>
              <label className="mt-5 flex items-start gap-2 text-[9px] leading-4 text-white/55"><input type="checkbox" checked={launchTermsAccepted} onChange={(event) => setLaunchTermsAccepted(event.target.checked)} className="mt-0.5" />I am 18+ and accept the <Link className="underline" href="/legal/terms" target="_blank">Terms</Link> and <Link className="underline" href="/legal/privacy" target="_blank">Privacy Policy</Link>.</label>
              <button type="button" onClick={() => void publish(null)} disabled={publishing || !launchTermsAccepted} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.07] disabled:opacity-50"><Rocket className="size-4 text-violet-300" /><span><span className="block text-[12px] font-semibold">Use the Eventloom address</span><span className="mt-0.5 block text-[10px] text-white/45">You can connect a custom domain later.</span></span></button>
              <div className="my-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.2em] text-white/25"><span className="h-px flex-1 bg-white/10" />or include a domain<span className="h-px flex-1 bg-white/10" /></div>
              <label className="text-[10px] font-medium text-white/55">Custom domain<div className="mt-1.5 flex gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Globe2 className="size-3.5 shrink-0 text-white/30" /><input value={domain} onChange={(event) => { setDomain(event.target.value.toLowerCase()); setDomainQuote(null); setDomainError(null); }} placeholder="your-event.com" autoCapitalize="none" autoCorrect="off" className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] text-white outline-none placeholder:text-white/25" /></div><button type="button" onClick={() => void checkDomain()} disabled={checkingDomain || !domain.trim()} className="rounded-xl border border-white/10 px-3 text-[11px] font-semibold hover:bg-white/10 disabled:opacity-35">{checkingDomain ? <Loader2 className="size-3.5 animate-spin" /> : "Check"}</button></div></label>
              {domainError ? <p role="alert" className="mt-2 text-[10px] leading-4 text-red-300">{domainError}</p> : null}
              {domainQuote ? <div className="mt-3 max-h-[55vh] overflow-y-auto rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3"><p className="text-[11px] font-semibold text-emerald-200">{domainQuote.domain} is available</p><p className="mt-1 text-[10px] text-white/55">Due now: USD 20.00 service + USD {domainQuote.registrationCost.toFixed(2)} domain. Current manual renewal price: USD {domainQuote.renewalCost.toFixed(2)}. Auto-renew is off.</p><p className="mt-3 text-[10px] font-semibold text-white/70">Registrant and beneficial owner</p><div className="mt-2 grid grid-cols-2 gap-2">{([['firstName','First name'],['lastName','Last name'],['organization','Organization (optional)'],['email','Email'],['phone','Phone (+country code)'],['address1','Address'],['address2','Unit (optional)'],['city','City'],['state','Province/state'],['postalCode','Postal/ZIP']] as const).map(([key,label]) => <label key={key} className={key === 'address1' || key === 'organization' ? 'col-span-2 text-[9px] text-white/50' : 'text-[9px] text-white/50'}>{label}<input value={registrant[key]} onChange={(event) => setRegistrant((current) => ({ ...current, [key]: event.target.value }))} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={!['organization','address2'].includes(key)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[11px] text-white outline-none" /></label>)}<label className="text-[9px] text-white/50">Country<select value={registrant.country} onChange={(event) => setRegistrant((current) => ({ ...current, country: event.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#222] px-2 py-2 text-[11px]"><option value="CA">Canada</option><option value="US">United States</option></select></label></div><label className="mt-3 flex items-start gap-2 text-[9px] leading-4 text-white/55"><input type="checkbox" checked={domainTermsAccepted} onChange={(event) => setDomainTermsAccepted(event.target.checked)} className="mt-0.5" />The registrant information is accurate and I accept the <Link className="underline" href="/legal/domains" target="_blank">domain policy</Link>, including the non-refundable registered-domain fee.</label><button type="button" onClick={() => void publish(domainQuote.domain)} disabled={publishing || !launchTermsAccepted || !domainTermsAccepted} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2.5 text-[11px] font-semibold text-black hover:bg-emerald-300 disabled:opacity-50">{publishing ? <Loader2 className="size-3.5 animate-spin" /> : <Globe2 className="size-3.5" />} Continue to secure checkout</button></div> : null}
              <p className="mt-4 text-[9px] leading-4 text-white/30">Availability and price are checked again before checkout. Registration occurs only after Stripe confirms payment.</p>
            </div>
          </div> : null}
        </form>
      </div>
    </header>
  );
}

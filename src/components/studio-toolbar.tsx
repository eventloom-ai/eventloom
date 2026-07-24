"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, Eye, Globe2, History, Laptop, Loader2, MessageSquareText, Redo2, Rocket, Smartphone, Tablet, Undo2, X } from "lucide-react";
import Link from "next/link";
import { requestFeedbackDialog } from "@/lib/feedback";
import { publishErrorPresentation } from "@/lib/publish-errors";

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
};

function eventStatusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

export function StudioToolbar({ eventId, title, status, saveStatus, viewport, canUndo, canRedo, onViewport, onUndo, onRedo, onToggleHistory }: StudioToolbarProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainQuote, setDomainQuote] = useState<{ domain: string; included: boolean; registrationCost: number; renewalCost: number; currency: string } | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [registrant, setRegistrant] = useState({ firstName: "", lastName: "", organization: "", email: "", phone: "", address1: "", address2: "", city: "", state: "", postalCode: "", country: "CA" });
  const [domainTermsAccepted, setDomainTermsAccepted] = useState(false);
  const [launchTermsAccepted, setLaunchTermsAccepted] = useState(false);
  const isPublished = status === "published";
  const publishIssue = publishError ? publishErrorPresentation(publishError, eventId) : null;

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
        setPublishError(payload?.error ?? "unknown");
        return;
      }
      if (payload?.checkout_url) {
        window.location.assign(payload.checkout_url);
        return;
      }
      window.location.reload();
    } catch {
      setPublishError("network_error");
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
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{title}</p><p className="text-[10px] text-white/45">{eventStatusLabel(status)} · {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "All changes saved"}</p></div>
      </div>

      <div className="hidden items-center rounded-lg border border-white/10 bg-black/20 p-1 md:flex">
        {(["desktop", "tablet", "mobile"] as const).map((item) => {
          const Icon = item === "desktop" ? Laptop : item === "tablet" ? Tablet : Smartphone;
          const label = item === "desktop" ? "Desktop view" : item === "tablet" ? "Tablet view" : "Phone view";
          return <button key={item} type="button" onClick={() => onViewport(item)} aria-label={label} title={label} aria-pressed={viewport === item} className={`grid size-7 place-items-center rounded-md transition ${viewport === item ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><Icon className="size-3.5" /></button>;
        })}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Undo2 className="size-3.5" /></button>
        <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-25"><Redo2 className="size-3.5" /></button>
        <button type="button" onClick={onToggleHistory} aria-label="Version history" title="Version history" className="hidden size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white sm:grid"><History className="size-3.5" /></button>
        <button type="button" onClick={() => requestFeedbackDialog()} aria-label="Send feedback" title="Send feedback" className="grid size-8 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"><MessageSquareText className="size-3.5" /></button>
        <Link href={`/app/events/${eventId}/preview`} target="_blank" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 sm:inline-flex"><Eye className="size-3.5" /> Preview</Link>
        <Link href={`/app/events/${eventId}/privacy`} className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/75 hover:bg-white/10 lg:inline-flex">Privacy</Link>
        <form
          action={`/api/events/${eventId}/publish`}
          method="post"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setLaunchOpen(true);
            setPublishError(null);
          }}
          className="relative"
        >
          <button
            type="submit"
            disabled={publishing}
            aria-busy={publishing}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:cursor-wait disabled:opacity-70 ${
              isPublished ? "bg-emerald-600 hover:bg-emerald-500" : "bg-violet-500 hover:bg-violet-400"
            }`}
          >
            <Rocket className="size-3.5" />
            {publishing ? (isPublished ? "Updating…" : "Publishing…") : (isPublished ? "Update site" : "Publish")}
          </button>

          {launchOpen ? (
            <div
              className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 sm:p-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="launch-title"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target && !publishing) setLaunchOpen(false);
              }}
            >
              <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1b1b1b] p-5 text-left shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p id="launch-title" className="text-xl font-semibold">
                      {isPublished ? "Update your live site" : "Publish your event site"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {isPublished
                        ? "Replace the live version with your latest saved changes. Your link stays the same."
                        : "Your draft stays private until secure checkout succeeds."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLaunchOpen(false)}
                    disabled={publishing}
                    aria-label="Close launch options"
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {publishIssue ? (
                  <div role="alert" className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.10] p-4 text-sm leading-6 text-amber-50">
                    <p>{publishIssue.message}</p>
                    {publishIssue.actionHref && publishIssue.actionLabel ? (
                      <Link href={publishIssue.actionHref} className="mt-3 inline-flex rounded-lg bg-amber-200 px-3 py-2 font-semibold text-amber-950 transition hover:bg-amber-100">
                        {publishIssue.actionLabel}
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {isPublished ? (
                  <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-5">
                    <p className="text-sm font-semibold text-emerald-200">No additional charge</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Guests may briefly see the current version while the update finishes.
                    </p>
                    <button
                      type="button"
                      onClick={() => void publish(null)}
                      disabled={publishing}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                    >
                      {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                      {publishing ? "Updating live site…" : "Update live site"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 rounded-2xl border border-violet-400/25 bg-violet-400/[0.08] p-5">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <p className="text-base font-semibold">Eventloom link</p>
                          <p className="mt-1 text-sm leading-6 text-white/55">One year of hosting, RSVP collection, and editing.</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-semibold">$20</p>
                          <p className="text-xs text-white/45">USD today</p>
                        </div>
                      </div>
                      <p className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs leading-5 text-white/55">
                        Recommended. You can add a custom domain later.
                      </p>
                    </div>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/65">
                      <input
                        type="checkbox"
                        checked={launchTermsAccepted}
                        onChange={(event) => setLaunchTermsAccepted(event.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-violet-500"
                      />
                      <span>
                        I am 18 or older and accept the{" "}
                        <Link className="font-medium text-white underline underline-offset-2" href="/legal/terms" target="_blank">Terms</Link>
                        {" "}and{" "}
                        <Link className="font-medium text-white underline underline-offset-2" href="/legal/privacy" target="_blank">Privacy Policy</Link>.
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => void publish(null)}
                      disabled={publishing || !launchTermsAccepted}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-45"
                    >
                      {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                      {publishing ? "Opening secure checkout…" : "Continue to checkout — $20 USD"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomDomain((current) => !current)}
                      aria-expanded={showCustomDomain}
                      className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.06]"
                    >
                      {showCustomDomain ? "Hide custom-domain options" : "I want a custom domain"}
                    </button>

                    {showCustomDomain ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                        <p className="text-sm font-semibold">Find your custom domain</p>
                        <p className="mt-1 text-xs leading-5 text-white/45">The registration price is added to the $20 Eventloom service.</p>
                        <label className="mt-4 block text-sm font-medium text-white/65">
                          Domain name
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3">
                              <Globe2 className="size-4 shrink-0 text-white/35" />
                              <input
                                value={domain}
                                onChange={(event) => {
                                  setDomain(event.target.value.toLowerCase());
                                  setDomainQuote(null);
                                  setDomainError(null);
                                }}
                                placeholder="your-event.com"
                                autoCapitalize="none"
                                autoCorrect="off"
                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/25"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void checkDomain()}
                              disabled={checkingDomain || !domain.trim()}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-35"
                            >
                              {checkingDomain ? <Loader2 className="size-4 animate-spin" /> : "Check availability"}
                            </button>
                          </div>
                        </label>

                        {domainError ? <p role="alert" className="mt-3 text-sm leading-5 text-red-300">{domainError}</p> : null}

                        {domainQuote ? (
                          <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
                            <p className="text-base font-semibold text-emerald-200">{domainQuote.domain} is available</p>
                            <div className="mt-3 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
                              <p className="rounded-lg bg-black/20 p-3">Due today<br /><strong className="text-white">USD {(20 + domainQuote.registrationCost).toFixed(2)}</strong></p>
                              <p className="rounded-lg bg-black/20 p-3">Manual domain renewal<br /><strong className="text-white">USD {domainQuote.renewalCost.toFixed(2)}</strong></p>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-white/45">Automatic renewal is off. The registered domain fee is non-refundable except where required by law.</p>

                            <p className="mt-5 text-sm font-semibold text-white/75">Domain owner details</p>
                            <p className="mt-1 text-xs leading-5 text-white/45">The registrar requires these details. You will be the registered owner.</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {([["firstName", "First name"], ["lastName", "Last name"], ["organization", "Organization (optional)"], ["email", "Email"], ["phone", "Phone (+country code)"], ["address1", "Address"], ["address2", "Unit (optional)"], ["city", "City"], ["state", "Province/state"], ["postalCode", "Postal/ZIP"]] as const).map(([key, label]) => (
                                <label key={key} className={`text-xs font-medium text-white/55 ${key === "address1" || key === "organization" ? "sm:col-span-2" : ""}`}>
                                  {label}
                                  <input
                                    value={registrant[key]}
                                    onChange={(event) => setRegistrant((current) => ({ ...current, [key]: event.target.value }))}
                                    type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                                    required={!["organization", "address2"].includes(key)}
                                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
                                  />
                                </label>
                              ))}
                              <label className="text-xs font-medium text-white/55">
                                Country
                                <select
                                  value={registrant.country}
                                  onChange={(event) => setRegistrant((current) => ({ ...current, country: event.target.value }))}
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#222] px-3 py-2.5 text-sm"
                                >
                                  <option value="CA">Canada</option>
                                  <option value="US">United States</option>
                                </select>
                              </label>
                            </div>

                            <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/60">
                              <input
                                type="checkbox"
                                checked={domainTermsAccepted}
                                onChange={(event) => setDomainTermsAccepted(event.target.checked)}
                                className="mt-0.5 size-4 shrink-0 accent-emerald-400"
                              />
                              <span>
                                These owner details are accurate. I accept the{" "}
                                <Link className="font-medium text-white underline underline-offset-2" href="/legal/domains" target="_blank">domain policy</Link>.
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => void publish(domainQuote.domain)}
                              disabled={publishing || !launchTermsAccepted || !domainTermsAccepted}
                              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-45"
                            >
                              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Globe2 className="size-4" />}
                              {publishing ? "Opening secure checkout…" : `Continue — USD ${(20 + domainQuote.registrationCost).toFixed(2)}`}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <p className="mt-4 text-center text-xs leading-5 text-white/35">
                      Payment is handled securely by Stripe. Nothing is published until payment succeeds.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </header>
  );
}

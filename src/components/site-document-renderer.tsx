import type { ComponentProps } from "react";
import { RsvpForm } from "@/components/rsvp-form";
import { SiteReveal } from "@/components/site-reveal";
import { SiteDocumentView, type SiteDocumentParts, type SiteDocumentRendererProps } from "@/components/site-document-view";

export { siteBindingValue, siteDocumentShellStyle, siteStyleToCss } from "@/components/site-document-view";

const liveParts: SiteDocumentParts = {
  Reveal: SiteReveal,
  Rsvp: (props) => <RsvpForm className="eventloom-managed-rsvp__form" {...props} />,
};

// One parts object per growth link, so the RSVP component keeps a stable identity across renders (no remount).
const growthParts = new Map<string, SiteDocumentParts>();

function partsFor(growthHref: string | undefined): SiteDocumentParts {
  if (!growthHref) return liveParts;
  let parts = growthParts.get(growthHref);
  if (!parts) {
    const Rsvp = (props: Omit<ComponentProps<typeof RsvpForm>, "growthHref">) => <RsvpForm className="eventloom-managed-rsvp__form" {...props} growthHref={growthHref} />;
    parts = { ...liveParts, Rsvp };
    growthParts.set(growthHref, parts);
    if (growthParts.size > 500) growthParts.delete(growthParts.keys().next().value as string);
  }
  return parts;
}

/**
 * The live renderer: reveal animation and the real RSVP form (guest pages, previews, the studio). `growthHref` is
 * passed only by published guest pages, for the "make your own" card shown after a guest replies.
 */
export function SiteDocumentRenderer({ growthHref, ...props }: Omit<SiteDocumentRendererProps, "parts"> & { growthHref?: string }) {
  return <SiteDocumentView {...props} parts={partsFor(growthHref)} />;
}

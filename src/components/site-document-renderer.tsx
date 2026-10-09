import { RsvpForm } from "@/components/rsvp-form";
import { SiteReveal } from "@/components/site-reveal";
import { SiteDocumentView, type SiteDocumentParts, type SiteDocumentRendererProps } from "@/components/site-document-view";

export { siteBindingValue, siteDocumentShellStyle, siteStyleToCss } from "@/components/site-document-view";

const liveParts: SiteDocumentParts = {
  Reveal: SiteReveal,
  Rsvp: (props) => <RsvpForm className="eventloom-managed-rsvp__form" {...props} />,
};

/** The live renderer: reveal animation and the real RSVP form (guest pages, previews, the studio). */
export function SiteDocumentRenderer(props: Omit<SiteDocumentRendererProps, "parts">) {
  return <SiteDocumentView {...props} parts={liveParts} />;
}

import { SiteDocumentView } from "@/components/site-document-view";
import { rootDomain } from "@/lib/env";
import { sampleSite, sampleThumbnailDocument, type OccasionTemplate } from "@/lib/occasion-templates";

/** The sample event rendered by the real site renderer, read-only, inside a scrollable browser frame. */
export function TemplateSitePreview({ occasion, styleIndex = 0 }: { occasion: OccasionTemplate; styleIndex?: number }) {
  const { config, document } = sampleSite(occasion, styleIndex);
  const style = occasion.styles[styleIndex] ?? occasion.styles[0];
  return (
    <figure className="overflow-hidden rounded-[1.5rem] border border-[#302821]/10 bg-[#fffaf3] shadow-[0_28px_80px_rgba(65,43,28,0.12)]">
      <div className="flex items-center gap-3 border-b border-[#302821]/10 px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#302821]/15" /><span className="size-2.5 rounded-full bg-[#302821]/15" /><span className="size-2.5 rounded-full bg-[#302821]/15" /></span>
        <span className="mx-auto max-w-[70%] truncate rounded-full bg-[#302821]/[0.06] px-4 py-1 text-xs text-[#74675d]">{rootDomain()}/your-event</span>
        <span aria-hidden="true" className="w-[2.6rem]" />
      </div>
      <div tabIndex={0} aria-label={`Sample ${occasion.name.toLowerCase()} website, ${style.name} style`} className="max-h-[30rem] overflow-y-auto sm:max-h-[42rem] focus:outline-2 focus:outline-offset-[-2px] focus:outline-[#8a6153]">
        <SiteDocumentView document={document} config={config} status="draft" rsvpOpen={false} readOnly />
      </div>
      <figcaption className="border-t border-[#302821]/10 px-5 py-3 text-xs leading-5 text-[#74675d]">Sample event with fictional names and details, shown in the {style.name} style. Scroll inside the frame to see the whole page.</figcaption>
    </figure>
  );
}

/** The top of the sample page, scaled down. Decorative: hidden from assistive tech and not focusable. */
export function TemplateThumbnail({ occasion, styleIndex = 0 }: { occasion: OccasionTemplate; styleIndex?: number }) {
  const { config, document } = sampleSite(occasion, styleIndex);
  return (
    <div aria-hidden="true" inert className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: document.theme.colors.surface }}>
      <div className="pointer-events-none absolute left-0 top-0 w-[300%] origin-top-left scale-[0.3334] select-none">
        <SiteDocumentView document={sampleThumbnailDocument(document)} config={config} status="draft" rsvpOpen={false} readOnly />
      </div>
    </div>
  );
}

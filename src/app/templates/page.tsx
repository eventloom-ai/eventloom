import type { Metadata } from "next";
import { TemplatesGalleryPage } from "@/components/templates-gallery-page";
import { templatesIndexMetadata } from "@/lib/occasion-templates";

export const metadata: Metadata = templatesIndexMetadata();

export default function TemplatesPage() {
  return <TemplatesGalleryPage />;
}

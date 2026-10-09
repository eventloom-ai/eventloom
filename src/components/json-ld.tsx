import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/structured-data";

export function JsonLd({ data }: { data: JsonLdData | readonly JsonLdData[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

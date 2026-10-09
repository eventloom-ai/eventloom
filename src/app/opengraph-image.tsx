import { ImageResponse } from "next/og";
import { GenericOgImage } from "@/lib/og/render-og-image";

export const alt = "Eventloom event websites with online RSVPs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<GenericOgImage />, size);
}

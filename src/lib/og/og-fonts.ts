import type { StyleKey } from "@/lib/event-design/styles";

/** A Google Fonts face as the share card uses it. `name` is the family name the card's JSX refers to. */
export type OgFontFace = { name: string; family: string; weight: number; italic: boolean };

/** The display and label faces of each design style (the same families the guest page loads through next/font). */
export const OG_STYLE_FONTS: Record<StyleKey, { display: OgFontFace; label: OgFontFace }> = {
  editorial: { display: { name: "OgDisplay", family: "Instrument Serif", weight: 400, italic: true }, label: { name: "OgLabel", family: "Work Sans", weight: 600, italic: false } },
  romantic: { display: { name: "OgDisplay", family: "Fraunces", weight: 300, italic: true }, label: { name: "OgLabel", family: "Work Sans", weight: 500, italic: false } },
  minimal: { display: { name: "OgDisplay", family: "Space Grotesk", weight: 500, italic: false }, label: { name: "OgLabel", family: "Space Grotesk", weight: 500, italic: false } },
  playful: { display: { name: "OgDisplay", family: "Bricolage Grotesque", weight: 800, italic: false }, label: { name: "OgLabel", family: "Outfit", weight: 700, italic: false } },
  noir: { display: { name: "OgDisplay", family: "Bodoni Moda", weight: 400, italic: true }, label: { name: "OgLabel", family: "IBM Plex Sans", weight: 500, italic: false } },
};

export type LoadedOgFont = { name: string; data: ArrayBuffer; weight: 300 | 400 | 500 | 600 | 700 | 800; style: "normal" | "italic" };

const FONT_TIMEOUT_MS = 3_000;
const MAX_CACHED_FONTS = 200;
const cachedFonts = new Map<string, Promise<ArrayBuffer | null>>();

/** The Google Fonts CSS2 URL for one face, subset to just the characters the card draws (a few KB per face). */
export function googleFontCssUrl(face: OgFontFace, text: string) {
  const glyphs = [...new Set(Array.from(text))].sort().join("");
  const axis = face.italic ? `ital,wght@1,${face.weight}` : `wght@${face.weight}`;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(face.family).replace(/%20/g, "+")}:${axis}&text=${encodeURIComponent(glyphs)}`;
}

async function fetchFont(cssUrl: string): Promise<ArrayBuffer | null> {
  try {
    // ImageResponse needs TTF/OTF; Google serves those (not WOFF2) to a client that does not ask for WOFF2.
    const css = await fetch(cssUrl, { signal: AbortSignal.timeout(FONT_TIMEOUT_MS) }).then((response) => (response.ok ? response.text() : ""));
    const source = css.match(/src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!source) return null;
    const font = await fetch(source, { signal: AbortSignal.timeout(FONT_TIMEOUT_MS) });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function loadFace(face: OgFontFace, text: string) {
  const url = googleFontCssUrl(face, text);
  let pending = cachedFonts.get(url);
  if (!pending) {
    pending = fetchFont(url);
    cachedFonts.set(url, pending);
    // A failed load is not remembered, so the next image tries again.
    void pending.then((data) => { if (!data) cachedFonts.delete(url); });
    for (const key of cachedFonts.keys()) {
      if (cachedFonts.size <= MAX_CACHED_FONTS) break;
      cachedFonts.delete(key);
    }
  }
  return pending;
}

/**
 * The style's display and label faces, fetched at render time (the ImageResponse docs suggest fetching assets at
 * runtime to stay under its bundle limit). Both or nothing: when either face is unavailable the card falls back to
 * ImageResponse's bundled default font, so an offline build or a Google outage never breaks the image.
 */
export async function loadOgFonts(styleKey: StyleKey, displayText: string, labelText: string): Promise<LoadedOgFont[] | undefined> {
  const { display, label } = OG_STYLE_FONTS[styleKey];
  const [displayData, labelData] = await Promise.all([loadFace(display, displayText), loadFace(label, labelText)]);
  if (!displayData || !labelData) return undefined;
  const loaded = (face: OgFontFace, data: ArrayBuffer): LoadedOgFont => ({ name: face.name, data, weight: face.weight as LoadedOgFont["weight"], style: face.italic ? "italic" : "normal" });
  return [loaded(display, displayData), loaded(label, labelData)];
}

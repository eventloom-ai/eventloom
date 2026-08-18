import type { SiteDocument, SiteNode, SiteStyle, SiteTexture } from "@/lib/site-document";

const DARK = "#1c1917";
const LIGHT = "#f6f1ea";

export function firstHex(value: string | undefined) {
  const match = value?.match(/#([0-9a-f]{6})\b/i);
  return match ? `#${match[1]}` : undefined;
}

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const channel = parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string) {
  const left = luminance(a);
  const right = luminance(b);
  const [high, low] = left > right ? [left, right] : [right, left];
  return (high + 0.05) / (low + 0.05);
}

export function readableOn(background: string) {
  return luminance(background) > 0.42 ? DARK : LIGHT;
}

export function textureImage(texture: SiteTexture | undefined, accent: string, surface: string) {
  if (texture === "paper") return `radial-gradient(ellipse at 18% 0%, color-mix(in srgb, ${accent} 22%, transparent), transparent 54%), repeating-linear-gradient(180deg, rgba(255,255,255,.04) 0 1px, transparent 1px 8px)`;
  if (texture === "grain") return `repeating-linear-gradient(90deg, color-mix(in srgb, ${accent} 12%, transparent) 0 1px, transparent 1px 11px), repeating-linear-gradient(0deg, rgba(0,0,0,.04) 0 1px, transparent 1px 9px)`;
  if (texture === "linen") return `repeating-linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent) 0 2px, transparent 2px 14px)`;
  if (texture === "wash") return `radial-gradient(ellipse at 80% 110%, color-mix(in srgb, ${accent} 28%, transparent), transparent 58%), radial-gradient(ellipse at 10% 0%, color-mix(in srgb, ${surface} 35%, transparent), transparent 46%)`;
  return undefined;
}

export function backgroundLayers(background: string | undefined, texture: SiteTexture | undefined, accent: string, surface: string) {
  const textureLayer = textureImage(texture, accent, surface);
  const gradient = background && /gradient\(/i.test(background) ? background : undefined;
  const color = background && !gradient ? background : undefined;
  const images = [textureLayer, gradient].filter(Boolean);
  return {
    backgroundColor: color,
    backgroundImage: images.length ? images.join(", ") : undefined,
  };
}

function isLayout(node: SiteNode) {
  return node.type === "section" || node.type === "stack" || node.type === "grid" || node.type === "overlay";
}

function isDisplayType(node: SiteNode) {
  return node.type === "text" && (node.variant === "heading" || node.style?.size === "hero" || node.style?.size === "xl");
}

function readableStyle(style: SiteStyle | undefined, inheritedBackground: string, themeText: string, themeSurface: string): SiteStyle {
  const next: SiteStyle = { ...style };
  const background = firstHex(next.background) ?? inheritedBackground;
  const color = firstHex(next.color);

  if (color && contrastRatio(color, background) < 3.2) {
    if (!next.background && luminance(color) > 0.55) next.background = themeText;
    else next.color = readableOn(firstHex(next.background) ?? background);
  } else if (!color && next.background && contrastRatio(themeText, background) < 3.2 && contrastRatio(themeSurface, background) >= 3.2) {
    next.color = themeSurface;
  }

  if (next.size === "hero" && (next.letterSpacing === "wide" || next.letterSpacing === "widest")) next.letterSpacing = "tight";
  return next;
}

function contrastNode(node: SiteNode, inheritedBackground: string, theme: SiteDocument["theme"]): SiteNode {
  const style: SiteStyle = { ...node.style };
  if (isLayout(node) && (style.opacity === "faint" || style.opacity === "muted")) delete style.opacity;
  if (isDisplayType(node) && style.opacity === "faint") delete style.opacity;
  const readable = readableStyle(style, inheritedBackground, theme.colors.text, theme.colors.surface);
  const nextBackground = firstHex(readable.background) ?? inheritedBackground;
  const next = { ...node, style: readable };
  if ("children" in next) return { ...next, children: next.children.map((child) => contrastNode(child, nextBackground, theme)) };
  return next;
}

export function ensureSiteLayout(document: SiteDocument): SiteDocument {
  const visit = (nodes: SiteNode[], depth: number): SiteNode[] => nodes.flatMap((node, index): SiteNode[] => {
    if (node.type === "image" && !node.url) return [];
    const style: SiteStyle = { ...node.style };
    if (depth === 0 && index === 0) {
      style.width = "full";
      if (style.minHeight === "screen" || style.minHeight === "threeQuarter") delete style.columns;
    }
    if (node.type === "text") {
      delete style.width;
      delete style.columns;
    }
    if ((node.type === "section" || node.type === "stack") && (style.minHeight === "screen" || style.minHeight === "threeQuarter") && (!style.justify || style.justify === "start") && "children" in node && node.children.length <= 2) {
      style.justify = "center";
    }
    const next = { ...node, style };
    if ("children" in next) return [{ ...next, children: visit(next.children, depth + 1) }];
    return [next];
  });

  return { ...document, nodes: visit(document.nodes, 0) };
}

export function ensureSiteContrast(document: SiteDocument): SiteDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => contrastNode(node, document.theme.colors.surface, document.theme)),
  };
}

export function prepareSiteDocument(document: SiteDocument) {
  return ensureSiteContrast(ensureSiteLayout(document));
}

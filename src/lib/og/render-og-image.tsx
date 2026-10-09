import type { CSSProperties, ReactElement } from "react";
import { ImageResponse } from "next/og";
import type { EventOgCard } from "@/lib/og/event-og-card";
import { loadOgFonts, OG_STYLE_FONTS } from "@/lib/og/og-fonts";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// An event card is addressed by a content hash (see ogImageId), so CDNs may keep it; the generic card stays short-lived.
const EVENT_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";
const GENERIC_CACHE_CONTROL = "public, max-age=300, s-maxage=300";

/** The Eventloom brand card: the site-wide share image and the stand-in for drafts, archived and missing events. */
export function GenericOgImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        color: "#fff9f2",
        background: "linear-gradient(135deg, #302821 0%, #4a2d2a 58%, #8a6153 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "30px", fontWeight: 700 }}>
        <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#f3d7bd", display: "flex" }} />
        Eventloom
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "930px" }}>
        <div style={{ fontSize: "68px", lineHeight: 1.03, fontWeight: 700, letterSpacing: "-2px" }}>Create a beautiful event website with RSVPs</div>
        <div style={{ marginTop: "28px", fontSize: "28px", lineHeight: 1.35, color: "#f7e7da" }}>Share one simple link. Keep every guest response organized.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: "#f3d7bd" }}>
        <span>Wedding · Birthday · Private events</span>
        <span>eventloom.co</span>
      </div>
    </div>
  );
}

const MARK = "eventloom.co";

function titleSize(card: EventOgCard) {
  if (card.coupleNames) {
    const longest = Math.max(card.coupleNames[0].length, card.coupleNames[1].length);
    return longest <= 8 ? 124 : longest <= 12 ? 104 : longest <= 18 ? 84 : 68;
  }
  const length = card.title.length;
  return length <= 12 ? 124 : length <= 22 ? 100 : length <= 36 ? 80 : length <= 52 ? 66 : 56;
}

/** Corner shapes and frames that echo each style's ornament on the page. Purely decorative. */
function Ornament({ card }: { card: EventOgCard }) {
  const { colors } = card;
  const frame = (inset: number, opacity: number): CSSProperties => ({ position: "absolute", top: inset, left: inset, right: inset, bottom: inset, border: `1.5px solid ${colors.line}`, opacity, display: "flex" });
  switch (card.styleKey) {
    case "romantic":
      return <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}><div style={frame(28, 0.55)} /><div style={frame(38, 0.3)} /></div>;
    case "noir":
      return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
          <div style={frame(26, 0.9)} />
          <div style={frame(36, 0.45)} />
          <div style={{ position: "absolute", top: 20, left: 588, width: 24, height: 24, transform: "rotate(45deg)", background: colors.accent, display: "flex" }} />
        </div>
      );
    case "playful": {
      const pops = colors.pops.length ? colors.pops : [colors.accent];
      const dot = (index: number, style: CSSProperties) => <div style={{ position: "absolute", borderRadius: 9999, background: pops[index % pops.length], display: "flex", ...style }} />;
      return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
          {dot(0, { width: 260, height: 260, top: -110, left: -90 })}
          {dot(1, { width: 180, height: 180, bottom: -70, right: 140 })}
          {dot(2, { width: 120, height: 120, top: 60, right: -40 })}
        </div>
      );
    }
    case "minimal":
      return <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 18, background: colors.accent, display: "flex" }} />;
    default:
      return <div style={{ position: "absolute", top: 64, left: 80, right: 80, height: 3, background: colors.ink, display: "flex" }} />;
  }
}

/** The share card for one published event, drawn in its design style's palette and type. */
export function EventOgImage({ card, fontsLoaded }: { card: EventOgCard; fontsLoaded: boolean }) {
  const { colors } = card;
  const faces = OG_STYLE_FONTS[card.styleKey];
  const centered = card.styleKey === "romantic" || card.styleKey === "noir" || card.styleKey === "playful";
  const size = titleSize(card);
  const display: CSSProperties = fontsLoaded
    ? { fontFamily: faces.display.name, fontWeight: faces.display.weight, fontStyle: faces.display.italic ? "italic" : "normal" }
    : {};
  const label: CSSProperties = fontsLoaded ? { fontFamily: faces.label.name, fontWeight: faces.label.weight } : {};
  const tracking = card.styleKey === "minimal" || card.styleKey === "playful" ? "-0.035em" : "-0.015em";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: colors.bg, color: colors.ink }}>
      <Ornament card={card} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: centered ? "center" : "flex-start",
          textAlign: centered ? "center" : "left",
          width: "100%",
          height: "100%",
          padding: centered ? "84px 120px 96px" : "96px 96px 100px 96px",
        }}
      >
        {card.eyebrow ? (
          <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.2em", color: colors.accentText, ...label }}>{card.eyebrow.toUpperCase()}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: centered ? "center" : "flex-start",
            alignItems: "baseline",
            columnGap: Math.round(size * 0.28),
            marginTop: 26,
            fontSize: size,
            lineHeight: 1.02,
            letterSpacing: tracking,
            maxWidth: 1000,
            ...display,
          }}
        >
          {card.coupleNames
            ? [
                <span key="first">{card.coupleNames[0]}</span>,
                <span key="and" style={{ color: colors.accentText }}>&amp;</span>,
                <span key="second">{card.coupleNames[1]}</span>,
              ]
            : <span>{card.title}</span>}
        </div>
        {card.details.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: centered ? "center" : "flex-start", gap: 18, marginTop: 34, fontSize: 28, color: colors.muted, ...label }}>
            {card.details.map((detail, index) => (
              <span key={detail} style={{ display: "flex", gap: 18 }}>
                {index > 0 ? <span style={{ color: colors.accentText }}>·</span> : null}
                <span>{detail}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, display: "flex", justifyContent: centered ? "center" : "flex-end", paddingRight: centered ? 0 : 96, fontSize: 20, letterSpacing: "0.08em", color: colors.muted, ...label }}>
        {MARK}
      </div>
    </div>
  );
}

function cardText(card: EventOgCard) {
  const display = card.coupleNames ? `${card.coupleNames[0]}${card.coupleNames[1]}&` : card.title;
  const label = `${card.eyebrow.toUpperCase()}${card.details.join("")}·${MARK}`;
  return { display, label };
}

/** The PNG response for a share card; `null` draws the generic Eventloom card. */
export async function renderOgImage(card: EventOgCard | null): Promise<ImageResponse> {
  if (!card) {
    return new ImageResponse(<GenericOgImage />, { ...OG_SIZE, headers: { "Cache-Control": GENERIC_CACHE_CONTROL } });
  }
  const text = cardText(card);
  const fonts = await loadOgFonts(card.styleKey, text.display, text.label);
  const element: ReactElement = <EventOgImage card={card} fontsLoaded={Boolean(fonts)} />;
  return new ImageResponse(element, { ...OG_SIZE, ...(fonts ? { fonts } : {}), headers: { "Cache-Control": EVENT_CACHE_CONTROL } });
}

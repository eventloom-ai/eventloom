import type { ReactNode } from "react";
import type { Ornament as OrnamentKind } from "@/lib/event-design/styles";
import type { DesignedSection } from "@/lib/event-design/types";
import s from "./event-sections.module.css";
import { toneVars, type SectionContext } from "./theme";

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/** Centered compositions (romantic, playful, noir) vs. start-aligned editorial grids (editorial, minimal). */
export const isCentered = (ctx: SectionContext) => ctx.style.ornament === "flourish" || ctx.style.ornament === "deco" || ctx.style.ornament === "squiggle";

export function SectionShell({ section, ctx, label, id, className, innerClassName, children }: {
  section: Pick<DesignedSection, "tone" | "ruled" | "kind">;
  ctx: SectionContext;
  label: string;
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      data-section={section.kind}
      data-tone={section.tone}
      className={cx(s.section, section.ruled && s.ruled, className)}
      style={toneVars(ctx.palette, section.tone)}
    >
      <div className={cx(s.inner, s.reveal, innerClassName)}>{children}</div>
    </section>
  );
}

/** "No. 02" (editorial), "(02)" (minimal) or nothing, ahead of a section eyebrow. */
function sectionIndex(ctx: SectionContext) {
  const number = String(ctx.number).padStart(2, "0");
  if (ctx.style.ornament === "rule") return `No. ${number}`;
  if (ctx.style.ornament === "grid") return `(${number})`;
  return null;
}

export function SectionHeader({ ctx, eyebrow, heading, align, compact = false, className, children }: {
  ctx: SectionContext;
  eyebrow: string;
  heading: string;
  align?: "start" | "center";
  /** A smaller heading for the narrow sidebar column of editorial/minimal layouts. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const centered = (align ?? (isCentered(ctx) ? "center" : "start")) === "center";
  const index = sectionIndex(ctx);
  return (
    <header className={cx("flex flex-col gap-5", centered ? "items-center text-center" : "items-start text-start", className)}>
      <p className={cx(s.label, "flex flex-wrap items-center gap-x-3 gap-y-1")}>
        {index ? <span className={s.numerals}>{index}</span> : null}
        {index ? <span aria-hidden="true" className={cx(s.lineBg, "inline-block h-px w-8")} /> : null}
        <span>{eyebrow}</span>
      </p>
      {/* An ampersand travels with the word after it, so a line never ends on "&". */}
      <h2 className={cx(s.display, compact ? s.h2Compact : s.h2, ctx.style.type.displayItalic && ctx.style.ornament !== "rule" && s.italic, "max-w-[18ch]")}>{heading.replace(/ & /g, " &\u00a0")}</h2>
      {centered ? <Ornament kind={ctx.style.ornament} /> : null}
      {children}
    </header>
  );
}

/** Small decorative divider in the style's language. Purely decorative, hidden from assistive tech. */
export function Ornament({ kind, className, width = 168 }: { kind: OrnamentKind; className?: string; width?: number }) {
  const common = { "aria-hidden": true, focusable: false, className: cx("block shrink-0", className), style: { color: "var(--ev-line)" } } as const;
  if (kind === "flourish") {
    return (
      <svg {...common} width={width} height={22} viewBox="0 0 168 22" fill="none">
        <path d="M2 11h52c8 0 12-7 18-7 4 0 6 3 6 5s-2 4-4 4-3-1.5-3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M166 11h-52c-8 0-12-7-18-7-4 0-6 3-6 5s2 4 4 4 3-1.5 3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M84 4c2.2 3 2.2 11 0 14-2.2-3-2.2-11 0-14Z" fill="currentColor" opacity="0.85" />
        <path d="M77 11c3-2.2 11-2.2 14 0-3 2.2-11 2.2-14 0Z" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }
  if (kind === "deco") {
    return (
      <svg {...common} width={width} height={20} viewBox="0 0 168 20" fill="none">
        <path d="M0 10h66M8 6h54M8 14h54" stroke="currentColor" strokeWidth="0.75" />
        <path d="M168 10h-66M160 6h-54M160 14h-54" stroke="currentColor" strokeWidth="0.75" />
        <path d="M84 1.5 92.5 10 84 18.5 75.5 10Z" stroke="currentColor" strokeWidth="0.9" />
        <path d="M84 6.5 87.5 10 84 13.5 80.5 10Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "squiggle") {
    return (
      <svg {...common} width={width * 0.8} height={18} viewBox="0 0 134 18" fill="none" style={{ color: "var(--ev-accent)" }}>
        <path d="M3 9c6-7 11-7 16 0s10 7 16 0 11-7 16 0 10 7 16 0 11-7 16 0 10 7 16 0 11-7 16 0 10 7 16 0" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "rule") {
    return (
      <span {...common} className={cx("flex w-full flex-col gap-[3px]", className)}>
        <span className="block h-[2px] w-full bg-current" />
        <span className="block h-px w-full bg-current" />
      </span>
    );
  }
  return <span {...common} className={cx("block h-[3px] w-10", className)} style={{ background: "var(--ev-accent)" }} />;
}

/** A light-weight inline arrow that mirrors in RTL. */
export function Arrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100">
      <path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

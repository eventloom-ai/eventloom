import Image from "next/image";
import type { DesignedSection, HeroProps } from "@/lib/event-design/types";
import s from "./event-sections.module.css";
import { Ornament, cx, isCentered } from "./shell";
import { toneVars, type SectionContext } from "./theme";

type HeroSection = Extract<DesignedSection, { kind: "hero" }>;

const titleSize = { xl: s.titleXl, lg: s.titleLg, md: s.titleMd } as const;

function Title({ props, ctx, centered, className }: { props: HeroProps; ctx: SectionContext; centered: boolean; className?: string }) {
  const italic = ctx.style.type.displayItalic && (props.coupleNames !== null || !["rule", "grid", "squiggle"].includes(ctx.style.ornament));
  const classes = cx(s.display, titleSize[props.titleScale], italic && s.italic, className);
  if (!props.coupleNames) return <h1 className={classes}>{props.title}</h1>;
  const [first, second] = props.coupleNames;
  // Couple names stack over an ampersand; screen readers get one natural sentence.
  return (
    <h1 className={classes} aria-label={`${first} & ${second}`}>
      <span aria-hidden="true" className="block">{first}</span>
      {centered ? (
        <>
          <span aria-hidden="true" className={cx("block text-[0.42em] leading-[1.25]", s.accentText)} style={{ fontStyle: "italic" }}>&amp;</span>
          <span aria-hidden="true" className="block">{second}</span>
        </>
      ) : (
        <span aria-hidden="true" className="block">
          <span className={s.accentText} style={{ fontStyle: "italic" }}>&amp;</span> {second}
        </span>
      )}
    </h1>
  );
}

function RsvpButton({ props, ghost = false, className }: { props: HeroProps; ghost?: boolean; className?: string }) {
  return <a href={props.cta.href} className={cx(s.button, ghost && s.buttonGhost, className)}>{props.cta.label}</a>;
}

/** The date large, the time as its own line, then the place; each fact stays whole when the line wraps. */
function CenteredFacts({ props, className }: { props: HeroProps; className?: string }) {
  const place = [props.venueName, props.venueLocality].filter(Boolean) as string[];
  return (
    <div className={cx("flex flex-col items-center gap-3 text-center", className)}>
      <p className={cx(s.display, s.h3, s.numerals)}><bdi>{props.date.dateLabel}</bdi></p>
      {props.date.time ? <p className={cx(s.display, s.numerals, s.accentText, "text-[clamp(1.25rem,1.1rem+0.5vw,1.55rem)] !leading-tight")}><bdi>{isRange(props) ? `From ${props.date.time}` : props.date.time}</bdi></p> : null}
      <p className={cx(s.label, "mt-1 flex max-w-[40rem] flex-col items-center gap-x-3 gap-y-1 sm:flex-row sm:flex-wrap sm:justify-center")}>
        {place.map((item, index) => <span key={item}>{index > 0 ? <span aria-hidden="true" className="me-3 hidden sm:inline">·</span> : null}{item}</span>)}
      </p>
    </div>
  );
}

const isRange = (props: HeroProps) => Boolean(props.date.day?.includes("–"));

function FactGrid({ props, withButton = true, className }: { props: HeroProps; withButton?: boolean; className?: string }) {
  const facts = [
    { label: "Date", value: props.date.dateLabel },
    ...(props.date.time ? [{ label: isRange(props) ? "Starts" : "Time", value: props.date.time }] : []),
    { label: "Place", value: props.venueName, sub: props.venueLocality },
  ];
  return (
    <div className={cx("grid gap-x-8 gap-y-6 border-t pt-6 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:items-end", s.hairlineStrong, className)}>
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <p className={s.label}>{fact.label}</p>
          <p className={cx(s.display, s.numerals, "mt-2 text-[clamp(1.35rem,1.1rem+0.9vw,1.85rem)] !leading-[1.15] [text-wrap:pretty]")}><bdi>{fact.value}</bdi></p>
          {fact.sub ? <p className={cx(s.muted, "mt-1 text-[0.95rem]")}>{fact.sub}</p> : null}
        </div>
      ))}
      {withButton ? <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end"><RsvpButton props={props} /></div> : null}
    </div>
  );
}

function HeroImage({ props, ctx, className, sizes = "(min-width: 1024px) 50vw, 100vw" }: { props: HeroProps; ctx: SectionContext; className?: string; sizes?: string }) {
  if (!props.image) return null;
  const frame = ctx.style.shape.frame === "arch" ? s.frameArch : ctx.style.shape.frame === "rounded" ? s.frameRounded : s.frameRect;
  return (
    <figure className={cx("relative m-0 overflow-hidden", frame, className)}>
      <Image src={props.image.url} alt={props.image.alt} fill priority unoptimized sizes={sizes} className="object-cover" />
    </figure>
  );
}

/* Full-bleed photo with a scrim; text sits low (minimal) or centered inside a gold frame (noir). */
function CoverHero({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  const { props } = section;
  const centered = isCentered(ctx);
  return (
    <section aria-label="Welcome" data-section="hero" className={cx(s.section, "isolate flex min-h-[100svh] flex-col", centered ? "justify-center" : "justify-end")} style={toneVars(ctx.palette, section.tone)}>
      {props.image ? <Image src={props.image.url} alt={props.image.alt} fill priority unoptimized sizes="100vw" className="-z-10 object-cover" /> : null}
      <div aria-hidden="true" className={cx(centered ? s.scrimCenter : s.scrim, "absolute inset-0 -z-10")} />
      {ctx.style.ornament === "deco" ? <div aria-hidden="true" className={cx(s.goldFrame, "pointer-events-none absolute inset-4 sm:inset-8")} /> : null}
      <div className={cx(s.inner, s.onPhoto, centered && "flex flex-col items-center px-5 py-12 text-center sm:px-10")}>
        {centered ? <Ornament kind={ctx.style.ornament} className="mb-8" /> : null}
        <p className={s.label}>{props.eyebrow}</p>
        <Title props={props} ctx={ctx} centered={centered} className={cx("mt-6", !centered && "max-w-[14ch]")} />
        {props.subtitle ? <p className={cx(s.lead, "mt-7 max-w-[40ch]")}>{props.subtitle}</p> : null}
        {centered ? (
          <>
            <Ornament kind={ctx.style.ornament} className="my-9" />
            <CenteredFacts props={props} />
            <RsvpButton props={props} className="mt-10" />
          </>
        ) : (
          <FactGrid props={props} className="mt-12" />
        )}
      </div>
    </section>
  );
}

/* Image and type side by side; the frame (rect, arch, rounded) and the facts treatment follow the style. */
function SplitHero({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  const { props } = section;
  const centered = isCentered(ctx);
  const playful = ctx.style.ornament === "squiggle";
  const editorial = ctx.style.ornament === "rule";
  return (
    <section aria-label="Welcome" data-section="hero" className={cx(s.section, "flex min-h-[min(100svh,64rem)] flex-col justify-center")} style={toneVars(ctx.palette, section.tone)}>
      <div className={s.inner}>
        {editorial ? (
          <div className="mb-10 lg:mb-14">
            <div className="flex items-end justify-between gap-6 pb-3">
              <p className={s.label}>{props.eyebrow}</p>
              <p className={cx(s.label, s.numerals, "hidden sm:block")}><bdi>{[props.date.monthShort, props.date.day, props.date.year].filter(Boolean).join(" ") || props.date.dateLabel}</bdi></p>
            </div>
            <Ornament kind="rule" />
          </div>
        ) : null}
        <div className="grid items-center gap-x-[clamp(2rem,6vw,6rem)] gap-y-10 [grid-template-areas:'text'_'image'_'facts'] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:[grid-template-areas:'text_image'_'facts_image']">
          <div className={cx("[grid-area:text] flex flex-col self-end", centered && !playful ? "items-center text-center" : "items-start text-start")}>
            {centered && !playful ? <Ornament kind={ctx.style.ornament} className="mb-7" /> : null}
            {!editorial ? <p className={cx(s.label, playful && "rounded-full px-4 py-1.5")} style={playful ? { background: "var(--ev-ink)", color: "var(--ev-bg)" } : undefined}>{props.eyebrow}</p> : null}
            <Title props={props} ctx={ctx} centered={centered && !playful} className={cx(!editorial && "mt-6")} />
            {props.subtitle ? <p className={cx(s.lead, "mt-7 max-w-[34ch]")}>{props.subtitle}</p> : null}
          </div>
          <div className="[grid-area:image] relative">
            <HeroImage props={props} ctx={ctx} className={cx("aspect-[4/5] w-full", playful && "rotate-[2deg]", centered && !playful && "mx-auto max-w-[30rem]")} />
            {playful ? (
              <div aria-hidden="true" className="absolute -bottom-5 start-[-0.5rem] grid size-[clamp(6.5rem,16vw,9rem)] -rotate-[10deg] place-items-center rounded-full text-center" style={{ background: "var(--ev-pop-1)", color: "var(--ev-ink)" }}>
                <span className={cx(s.display, "text-[clamp(2.2rem,5vw,3.2rem)] !leading-none")}>{props.date.day ?? "★"}</span>
                <span className={cx(s.label, "!text-[0.7rem] -mt-4")} style={{ color: "var(--ev-ink)" }}>{props.date.monthShort ?? "Save"}</span>
              </div>
            ) : null}
          </div>
          <div className={cx("[grid-area:facts] self-start", centered && !playful && "flex flex-col items-center")}>
            {editorial ? <EditorialDate props={props} /> : null}
            {centered && !playful ? <><CenteredFacts props={props} /><RsvpButton props={props} className="mt-9" /></> : null}
            {playful ? <PillFacts props={props} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* A big day numeral with the month, weekday, time and venue set beside it. */
function EditorialDate({ props }: { props: HeroProps }) {
  const { date } = props;
  return (
    <div className="flex flex-col gap-8">
      <div className={cx("flex items-start gap-5 border-t pt-6", s.hairlineStrong)}>
        {date.day ? <p className={cx(s.display, s.numerals, s.accentText, "text-[clamp(4.5rem,3rem+5vw,7.5rem)] !leading-[0.8]")}><bdi>{date.day}</bdi></p> : null}
        <div className="min-w-0 pt-1">
          <p className={cx(s.display, "text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] !leading-[1.1]")}>{date.day ? [date.month, date.year].filter(Boolean).join(" ") : date.dateLabel}</p>
          <p className={cx(s.label, "mt-2 !text-[var(--ev-ink)]")}>{[date.day ? date.weekday : null, date.time].filter(Boolean).join(" · ")}</p>
          <p className={cx(s.muted, "mt-3 text-[1rem] leading-snug")}>{[props.venueName, props.venueLocality].filter(Boolean).join(", ")}</p>
        </div>
      </div>
      <RsvpButton props={props} className="self-start" />
    </div>
  );
}

function PillFacts({ props }: { props: HeroProps }) {
  const pills = [props.date.dateLabel, props.date.time, props.venueName].filter(Boolean) as string[];
  return (
    <div className="flex flex-col items-start gap-7">
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {pills.map((pill, index) => (
          <li key={pill} className={cx(s.numerals, "rounded-full border-2 px-4 py-2 text-[1.02rem] font-semibold leading-tight")} style={{ borderColor: "var(--ev-ink)", background: index === 0 ? "var(--ev-ink)" : "var(--ev-card)", color: index === 0 ? "var(--ev-bg)" : "var(--ev-ink)" }}><bdi>{pill}</bdi></li>
        ))}
      </ul>
      <RsvpButton props={props} className="!min-h-[3.75rem] !px-9 !text-[0.95rem] shadow-[4px_4px_0_var(--ev-ink)]" />
    </div>
  );
}

/* No photo, editorial or minimal: a masthead, a giant title and a typeset row of facts with the date set huge. */
function TypesetHero({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  const { props } = section;
  const { date } = props;
  const minimal = ctx.style.ornament === "grid";
  return (
    <section aria-label="Welcome" data-section="hero" className={cx(s.section, "flex min-h-[min(100svh,60rem)] flex-col")} style={toneVars(ctx.palette, section.tone)}>
      {minimal ? <div aria-hidden="true" className={cx(s.gridLines, "pointer-events-none absolute inset-0")} /> : null}
      <div className={cx(s.inner, "flex w-full flex-1 flex-col justify-between gap-14")}>
        <div>
          <div className="flex items-end justify-between gap-6 pb-3">
            <p className={cx(s.label, "flex items-center gap-3")}>{minimal ? <span aria-hidden="true" className="inline-block size-2.5" style={{ background: "var(--ev-accent)" }} /> : null}{props.eyebrow}</p>
            <a href={props.cta.href} className={cx(s.label, s.link, "!text-[var(--ev-ink)]")}>{props.cta.label}</a>
          </div>
          {minimal ? <div className={cx(s.lineBg, "h-px w-full")} /> : <Ornament kind="rule" />}
        </div>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <Title props={{ ...props, titleScale: props.titleScale === "md" ? "lg" : "xl" }} ctx={ctx} centered={false} className="max-w-[14ch] lg:col-span-12" />
          {props.subtitle ? <p className={cx(s.lead, "max-w-[38ch]", minimal ? cx(s.muted, "lg:col-span-6") : "lg:col-span-5 lg:col-start-8")}>{props.subtitle}</p> : null}
        </div>
        <div className={cx("grid gap-x-10 gap-y-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-12", minimal ? s.hairline : s.hairlineStrong)}>
          <div className="flex items-start gap-4 sm:col-span-2 lg:col-span-5">
            {date.day ? <p className={cx(s.display, s.numerals, "text-[clamp(5rem,3rem+7vw,9.5rem)] !leading-[0.78]", minimal ? "" : s.accentText)} style={minimal ? { color: "var(--ev-accent-text)" } : undefined}><bdi>{date.day}</bdi></p> : null}
            <div className="min-w-0 pt-1">
              <p className={s.label}>Date</p>
              <p className={cx(s.display, "mt-2 text-[clamp(1.5rem,1.2rem+1vw,2.15rem)] !leading-[1.08]")}>{date.day ? [date.month, date.year].filter(Boolean).join(" ") : date.dateLabel}</p>
              {date.day && date.weekday ? <p className={cx(s.muted, "mt-1")}>{date.weekday}</p> : null}
            </div>
          </div>
          {date.time ? (
            <div className="lg:col-span-3">
              <p className={s.label}>Time</p>
              <p className={cx(s.display, s.numerals, "mt-2 text-[clamp(1.5rem,1.2rem+1vw,2.15rem)] !leading-[1.08]")}><bdi>{date.time}</bdi></p>
            </div>
          ) : null}
          <div className="lg:col-span-4">
            <p className={s.label}>Place</p>
            <p className={cx(s.display, "mt-2 text-[clamp(1.5rem,1.2rem+1vw,2.15rem)] !leading-[1.08]")}>{props.venueName}</p>
            {props.venueLocality ? <p className={cx(s.muted, "mt-1")}>{props.venueLocality}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* No photo, romantic or noir: an invitation card with a monogram, framed by an arch (romantic) or gold rules (noir). */
function MonogramHero({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  const { props } = section;
  const deco = ctx.style.ornament === "deco";
  return (
    <section aria-label="Welcome" data-section="hero" className={cx(s.section, "flex min-h-[min(100svh,62rem)] flex-col justify-center")} style={toneVars(ctx.palette, section.tone)}>
      <div className={cx(s.inner, "w-full !max-w-[52rem]")}>
        <div
          className={cx("relative flex flex-col items-center px-[clamp(1.25rem,5vw,4.5rem)] pb-[clamp(3rem,7vw,5rem)] pt-[clamp(3.5rem,9vw,6.5rem)] text-center", deco ? s.goldFrame : "border")}
          style={deco ? undefined : { borderColor: "color-mix(in srgb, var(--ev-line) 70%, transparent)", borderRadius: "50% 50% 0 0 / clamp(7rem, 22vw, 15rem) clamp(7rem, 22vw, 15rem) 0 0" }}
        >
          {!deco ? <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 border" style={{ borderColor: "color-mix(in srgb, var(--ev-line) 35%, transparent)", borderRadius: "50% 50% 0 0 / clamp(6.4rem, 21vw, 14.4rem) clamp(6.4rem, 21vw, 14.4rem) 0 0" }} /> : null}
          <div aria-hidden="true" className={cx("grid size-[4.75rem] place-items-center border", deco && "rotate-45")} style={{ borderColor: "var(--ev-line)", borderRadius: deco ? 0 : "999px" }}>
            <span className={cx(s.display, s.italic, "text-[1.6rem] !leading-none !tracking-normal", deco && "-rotate-45")} style={{ color: "var(--ev-accent-text)" }}>{props.monogram}</span>
          </div>
          <p className={cx(s.label, "mt-9")}>{props.eyebrow}</p>
          <Title props={props} ctx={ctx} centered className="mt-6" />
          {props.subtitle ? <p className={cx(s.lead, s.muted, "mt-7 max-w-[34ch]")}>{props.subtitle}</p> : null}
          <Ornament kind={ctx.style.ornament} className="my-9" />
          <CenteredFacts props={props} />
          <RsvpButton props={props} className="mt-10" />
        </div>
      </div>
    </section>
  );
}

/* No photo, playful: a party poster with a big sticker numeral, confetti and color blobs. */
function PosterHero({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  const { props } = section;
  const big = props.numeral ?? props.date.day ?? props.monogram;
  return (
    <section aria-label="Welcome" data-section="hero" className={cx(s.section, "isolate flex min-h-[min(100svh,58rem)] flex-col justify-center")} style={toneVars(ctx.palette, section.tone)}>
      <div aria-hidden="true" className={cx(s.confetti, "absolute inset-0 -z-10")} />
      <div aria-hidden="true" className="absolute -end-[12vw] -top-[14vw] -z-10 size-[44vw] max-h-[36rem] max-w-[36rem] rounded-full" style={{ background: "var(--ev-pop-3)", opacity: 0.9 }} />
      <div aria-hidden="true" className="absolute -bottom-[9rem] end-[30%] -z-10 hidden size-[18rem] rotate-12 rounded-[38%] lg:block" style={{ background: "var(--ev-pop-2)" }} />
      <div className={cx(s.inner, "grid w-full items-center gap-12 lg:grid-cols-12")}>
        <div className="flex flex-col items-start lg:col-span-7">
          <p className={cx(s.label, "rounded-full px-4 py-1.5")} style={{ background: "var(--ev-ink)", color: "var(--ev-bg)" }}>{props.eyebrow}</p>
          <Title props={props} ctx={ctx} centered={false} className="mt-7 max-w-[11ch]" />
          {props.subtitle ? <p className={cx(s.lead, "mt-7 max-w-[34ch] font-medium")}>{props.subtitle}</p> : null}
          <div className="mt-9"><PillFacts props={props} /></div>
        </div>
        <div className="flex justify-center lg:col-span-5">
          <div aria-hidden="true" className="relative grid aspect-square w-[min(78vw,26rem)] -rotate-[8deg] place-items-center rounded-full text-center shadow-[8px_8px_0_var(--ev-ink)]" style={{ background: "var(--ev-pop-1)", color: "var(--ev-ink)", border: "3px solid var(--ev-ink)" }}>
            <div>
              <p className={cx(s.display, s.numerals, "text-[clamp(7rem,30vw,12.5rem)] !leading-[0.8]")}><bdi>{big}</bdi></p>
              <p className={cx(s.label, "mt-3 !text-[0.95rem]")} style={{ color: "var(--ev-ink)" }}>{[props.date.weekday?.slice(0, 3), props.date.monthShort, props.date.day].filter(Boolean).join(" · ") || props.date.dateLabel}</p>
            </div>
            <svg className="absolute -end-2 -top-2 size-16 rotate-12" viewBox="0 0 64 64" style={{ color: "var(--ev-pop-5)" }}>
              <path d="M32 2l7.5 19.5L60 24l-15.5 13L49 58 32 46.5 15 58l4.5-21L4 24l20.5-2.5z" fill="currentColor" stroke="var(--ev-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroSection({ section, ctx }: { section: HeroSection; ctx: SectionContext }) {
  if (section.variant === "cover" && section.props.image) return <CoverHero section={section} ctx={ctx} />;
  if (section.variant === "split" && section.props.image) return <SplitHero section={section} ctx={ctx} />;
  if (section.variant === "poster") return <PosterHero section={section} ctx={ctx} />;
  if (section.variant === "monogram") return <MonogramHero section={section} ctx={ctx} />;
  return <TypesetHero section={section} ctx={ctx} />;
}

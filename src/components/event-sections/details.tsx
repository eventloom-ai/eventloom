import type { DesignedSection, DetailsProps } from "@/lib/event-design/types";
import s from "./event-sections.module.css";
import { Arrow, Ornament, SectionHeader, SectionShell, cx } from "./shell";
import type { SectionContext } from "./theme";

type DetailsSection = Extract<DesignedSection, { kind: "details" }>;

function extras(props: DetailsProps) {
  return [
    props.rsvpDeadline ? { label: "Reply by", value: props.rsvpDeadline } : null,
    props.dressCode ? { label: "Dress code", value: props.dressCode } : null,
    props.hallInfo ? { label: "Good to know", value: props.hallInfo } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
}

/** "4:30 PM", or "From 2:00 PM" for a multi-day range where the time is only the start. */
const timeLabel = (props: DetailsProps) => (props.date.day?.includes("–") ? `From ${props.date.time}` : props.date.time);

/** The date, as large as the layout allows: a day numeral when the date parses, the host's wording when it doesn't. */
function When({ props, numeralClass, centered = false }: { props: DetailsProps; numeralClass?: string; centered?: boolean }) {
  const { date } = props;
  return (
    <div className={cx("flex flex-col", centered && "items-center text-center")}>
      <p className={s.label}>When</p>
      {date.day ? (
        <div className={cx("mt-4 flex items-end gap-4", centered && "justify-center")}>
          <p className={cx(s.display, s.numerals, "whitespace-nowrap !leading-[0.8]", date.day.includes("–") ? "text-[clamp(3.25rem,2.4rem+2.8vw,5rem)]" : "text-[clamp(4.5rem,3rem+5vw,7rem)]", numeralClass)}><bdi>{date.day}</bdi></p>
          <div className="pb-1 text-start">
            <p className={cx(s.display, "text-[clamp(1.35rem,1.1rem+0.8vw,1.8rem)] !leading-[1.05]")}>{date.month}</p>
            <p className={cx(s.muted, s.numerals, "text-[1rem]")}><bdi>{[date.weekday, date.year].filter(Boolean).join(", ")}</bdi></p>
          </div>
        </div>
      ) : (
        <p className={cx(s.display, s.h3, "mt-4")}>{date.dateLabel}</p>
      )}
      {date.time ? <p className={cx(s.display, s.numerals, s.accentText, "mt-5 text-[clamp(1.6rem,1.3rem+1vw,2.25rem)] !leading-none")}><bdi>{timeLabel(props)}</bdi></p> : null}
    </div>
  );
}

function Where({ props, centered = false }: { props: DetailsProps; centered?: boolean }) {
  return (
    <div className={cx("flex flex-col", centered && "items-center text-center")}>
      <p className={s.label}>Where</p>
      <p className={cx(s.display, s.h3, "mt-4 max-w-[20ch]")}>{props.venueName}</p>
      {props.venueAddress ? <p className={cx(s.muted, "mt-3 max-w-[28ch] text-[1rem] leading-relaxed")}>{props.venueAddress}</p> : null}
      {props.mapUrl ? (
        <a href={props.mapUrl} target="_blank" rel="noreferrer" className={cx(s.link, s.label, "mt-5 inline-flex items-center gap-2 !text-[var(--ev-ink)]")}>
          Get directions <Arrow />
        </a>
      ) : null}
    </div>
  );
}

function Extras({ props, centered = false, className }: { props: DetailsProps; centered?: boolean; className?: string }) {
  const items = extras(props);
  if (!items.length) return null;
  return (
    <dl className={cx("m-0 grid gap-6 sm:grid-flow-col sm:auto-cols-fr", centered && "text-center", className)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className={s.label}>{item.label}</dt>
          <dd className="m-0 mt-2 text-[1.05rem] leading-snug [text-wrap:pretty]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ColumnsDetails({ section, ctx }: { section: DetailsSection; ctx: SectionContext }) {
  const { props } = section;
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
        <SectionHeader ctx={ctx} eyebrow="Details" heading={props.heading} compact className="lg:col-span-4" />
        <div className="lg:col-span-8">
          <div className={cx("grid gap-y-10 border-t pt-8 sm:grid-cols-2 sm:gap-x-10", s.hairlineStrong)}>
            <When props={props} />
            <Where props={props} />
          </div>
          <Extras props={props} className={cx("mt-10 border-t pt-8", s.hairline)} />
        </div>
      </div>
    </SectionShell>
  );
}

function CardDetails({ section, ctx }: { section: DetailsSection; ctx: SectionContext }) {
  const { props } = section;
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <SectionHeader ctx={ctx} eyebrow="Details" heading={props.heading} />
      <div className={cx(s.card, "relative mx-auto mt-12 max-w-[56rem] p-[clamp(1.75rem,5vw,4rem)]")}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 border" style={{ borderColor: "color-mix(in srgb, var(--ev-line) 45%, transparent)" }} />
        <div className="relative grid items-start gap-12 md:grid-cols-[1fr_auto_1fr] md:gap-10">
          <When props={props} centered />
          <div aria-hidden="true" className="hidden h-full w-px md:block" style={{ background: "color-mix(in srgb, var(--ev-line) 45%, transparent)" }} />
          <Where props={props} centered />
        </div>
        {extras(props).length ? (
          <div className="relative mt-12 flex flex-col items-center gap-10">
            <Ornament kind={ctx.style.ornament} width={120} />
            <Extras props={props} centered className="w-full" />
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function TicketDetails({ section, ctx }: { section: DetailsSection; ctx: SectionContext }) {
  const { props } = section;
  const { date } = props;
  const playful = ctx.style.ornament === "squiggle";
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <SectionHeader ctx={ctx} eyebrow="Details" heading={props.heading} />
      <div className={cx(s.card, playful ? s.stickerCard : s.goldFrame, "mx-auto mt-12 grid max-w-[60rem] overflow-hidden md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]")}>
        <div className="flex flex-col items-center justify-center gap-1 p-[clamp(1.75rem,4vw,3rem)] text-center" style={playful ? { background: "var(--ev-pop-1)", color: "var(--ev-ink)" } : undefined}>
          <p className={s.label} style={playful ? { color: "var(--ev-ink)" } : undefined}>{date.weekday ?? "Save the date"}</p>
          {date.day ? (
            <>
              <p className={cx(s.display, s.numerals, "mt-2 whitespace-nowrap !leading-[0.85]", date.day.includes("–") ? "text-[clamp(3.25rem,2.4rem+2.8vw,5rem)]" : "text-[clamp(4.5rem,3rem+5vw,7.5rem)]")}><bdi>{date.day}</bdi></p>
              <p className={cx(s.display, "text-[clamp(1.4rem,1.1rem+0.9vw,1.9rem)] !leading-tight")}>{[date.month, date.year].filter(Boolean).join(" ")}</p>
            </>
          ) : (
            <p className={cx(s.display, s.h3, "mt-2")}>{date.dateLabel}</p>
          )}
          {date.time ? <p className={cx(s.label, "mt-4 !text-[0.95rem]")} style={playful ? { color: "var(--ev-ink)" } : undefined}>{timeLabel(props)}</p> : null}
        </div>
        <div className={cx(s.perforation, "flex flex-col gap-8 p-[clamp(1.75rem,4vw,3rem)]")}>
          <Where props={props} />
          <Extras props={props} className={cx("border-t pt-6", s.hairline)} />
        </div>
      </div>
    </SectionShell>
  );
}

export function DetailsSection({ section, ctx }: { section: DetailsSection; ctx: SectionContext }) {
  if (section.variant === "card") return <CardDetails section={section} ctx={ctx} />;
  if (section.variant === "ticket") return <TicketDetails section={section} ctx={ctx} />;
  return <ColumnsDetails section={section} ctx={ctx} />;
}

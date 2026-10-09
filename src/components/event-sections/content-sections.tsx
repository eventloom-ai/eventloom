import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { DesignedSection } from "@/lib/event-design/types";
import s from "./event-sections.module.css";
import { Arrow, Ornament, SectionHeader, SectionShell, cx, isCentered } from "./shell";
import type { SectionContext } from "./theme";

type Of<K extends DesignedSection["kind"]> = Extract<DesignedSection, { kind: K }>;

/* Story / note from the hosts --------------------------------------------- */

export function StorySection({ section, ctx }: { section: Of<"story">; ctx: SectionContext }) {
  const { props } = section;
  if (section.variant === "letter") {
    return (
      <SectionShell section={section} ctx={ctx} label={props.heading}>
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} className="lg:col-span-5" />
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-12">
            <div className={cx(s.body, ctx.style.ornament === "rule" && s.dropCap, "text-[clamp(1.1rem,1rem+0.35vw,1.3rem)] leading-[1.7]")}>
              {props.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {props.signature ? <p className={cx(s.display, s.italic, "mt-8 text-[clamp(1.6rem,1.3rem+1vw,2.2rem)] !leading-tight")}>{props.signature}</p> : null}
          </div>
        </div>
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} />
      <div className={cx(s.body, "mx-auto mt-10 max-w-[36rem] text-center text-[clamp(1.08rem,1rem+0.3vw,1.25rem)] leading-[1.75]")}>
        {props.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      {props.signature ? <p className={cx(s.display, s.italic, s.accentText, "mt-10 text-center text-[clamp(1.6rem,1.3rem+1vw,2.25rem)] !leading-tight")}>{props.signature}</p> : null}
    </SectionShell>
  );
}

/* Gallery --------------------------------------------------------------- */

export function GallerySection({ section, ctx }: { section: Of<"gallery">; ctx: SectionContext }) {
  const { props } = section;
  const playful = ctx.style.ornament === "squiggle";
  const noir = ctx.style.ornament === "deco";
  const radius: CSSProperties = { borderRadius: "var(--ev-radius)" };
  const header = <SectionHeader ctx={ctx} eyebrow="Gallery" heading={props.heading} />;
  if (props.images.length < 3) {
    // One or two photos: a single wide frame, or a matched pair, instead of a sparse grid.
    const pair = props.images.length === 2;
    return (
      <SectionShell section={section} ctx={ctx} label={props.heading}>
        {header}
        <div className={cx("mx-auto mt-12 grid gap-[clamp(0.6rem,1.5vw,1.25rem)]", pair ? "max-w-5xl sm:grid-cols-2" : "max-w-4xl")}>
          {props.images.map((image) => (
            <figure key={image.url} className="relative m-0 w-full overflow-hidden" style={{ ...radius, aspectRatio: pair ? "4 / 5" : "3 / 2" }}>
              <Image src={image.url} alt={image.alt} fill unoptimized sizes={pair ? "(min-width: 640px) 50vw, 100vw" : "100vw"} className="object-cover" />
            </figure>
          ))}
        </div>
      </SectionShell>
    );
  }
  if (section.variant === "masonry") {
    // Explicit columns (2 on phones, 3 on desktop) whose last tile stretches, so the gallery ends on one line.
    // Equal tile counts per column (extra photos are dropped) and alternating 4:5 / 1:1 tiles keep the columns level.
    const columns = (count: number) => {
      const usable = props.images.slice(0, Math.max(count, props.images.length - (props.images.length % count)));
      return Array.from({ length: count }, (_, column) => usable.filter((_, index) => index % count === column));
    };
    const layout = (count: number, className: string) => (
      <div className={cx("grid gap-[clamp(0.6rem,1.5vw,1.25rem)]", className)} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {columns(count).map((images, column) => (
          <div key={column} className={s.masonryColumn}>
            {images.map((image, index) => (
              <figure key={image.url} className="relative m-0 w-full overflow-hidden" style={{ ...radius, aspectRatio: (column + index) % 2 === 0 ? "4 / 5" : "1 / 1" }}>
                <Image src={image.url} alt={image.alt} fill unoptimized sizes={count === 3 ? "33vw" : "50vw"} className="object-cover" />
              </figure>
            ))}
          </div>
        ))}
      </div>
    );
    return (
      <SectionShell section={section} ctx={ctx} label={props.heading}>
        {header}
        <div className="mt-12">
          {layout(2, "lg:hidden")}
          {layout(3, "max-lg:hidden")}
        </div>
      </SectionShell>
    );
  }
  // Grid: a 2×2 feature tile plus squares. Show only as many tiles as complete the last row
  // (a multiple of 3 on desktop, an odd count on phones) so the grid never ends on an orphan.
  const total = props.images.length;
  const desktopCount = Math.max(3, total - (total % 3));
  const phoneCount = total % 2 === 1 ? total : total - 1;
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      {header}
      <div className="mt-12 grid grid-cols-2 gap-[clamp(0.6rem,1.5vw,1.25rem)] md:grid-cols-3">
        {props.images.map((image, index) => (
          <figure
            key={image.url}
            className={cx(
              "relative m-0 aspect-square overflow-hidden",
              index === 0 && "col-span-2 row-span-2",
              index >= phoneCount && "max-md:hidden",
              index >= desktopCount && "md:hidden",
              playful && s.stickerCard,
              playful && (index % 2 ? "rotate-[1.2deg]" : "-rotate-[1deg]"),
              noir && "border",
            )}
            style={{ ...radius, ...(noir ? { borderColor: "color-mix(in srgb, var(--ev-line) 45%, transparent)" } : {}) }}
          >
            <Image src={image.url} alt={image.alt} fill unoptimized sizes={index === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"} className="object-cover" />
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

/* Good to know / dress code ------------------------------------------------ */

export function GoodToKnowSection({ section, ctx }: { section: Of<"goodToKnow">; ctx: SectionContext }) {
  const { props } = section;
  const centered = isCentered(ctx);
  const playful = ctx.style.ornament === "squiggle";
  const noir = ctx.style.ornament === "deco";
  const count = props.items.length;
  const columns = count % 3 === 0 || count >= 5 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} />
      <ul className={cx("m-0 mt-12 grid list-none gap-[clamp(1rem,2vw,1.5rem)] p-0 sm:grid-cols-2", columns, !centered && "gap-y-10")}>
        {props.items.map((item, index) => (
          <li
            key={item.title}
            className={cx(
              "flex flex-col",
              centered ? cx(s.card, "p-[clamp(1.5rem,3vw,2.25rem)]") : cx("border-t pt-6", s.hairlineStrong),
              centered && !playful && !noir && "items-center text-center",
              playful && s.stickerCard,
              noir && s.goldFrame,
            )}
          >
            {playful ? (
              <span aria-hidden="true" className="mb-5 grid size-11 place-items-center rounded-full border-2 text-[1.05rem] font-bold" style={{ background: `var(--ev-pop-${(index % 5) + 1})`, borderColor: "var(--ev-ink)", color: "var(--ev-ink)" }}>{index + 1}</span>
            ) : (
              <p className={cx(s.label, s.numerals)}><bdi>{String(index + 1).padStart(2, "0")}</bdi></p>
            )}
            <h3 className={cx(s.display, "mt-3 text-[clamp(1.4rem,1.2rem+0.6vw,1.75rem)] !leading-[1.12]")}>{item.title}</h3>
            <p className={cx(s.muted, "mt-3 text-[1rem] leading-relaxed [text-wrap:pretty]")}>{item.body}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* Travel & stay ------------------------------------------------------------- */

export function TravelSection({ section, ctx }: { section: Of<"travel">; ctx: SectionContext }) {
  const { props } = section;
  const centered = isCentered(ctx);
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <div className={cx("grid gap-x-12 gap-y-12", !centered && "lg:grid-cols-12")}>
        <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} compact={!centered} className={cx(!centered && "lg:col-span-4")} />
        <ul className={cx("m-0 grid list-none gap-0 p-0", centered ? "mx-auto w-full max-w-[48rem]" : "lg:col-span-8")}>
          {props.items.map((item) => (
            <li key={item.title} className={cx("grid gap-4 border-t py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-10", s.hairlineStrong)}>
              <div className="min-w-0">
                <h3 className={cx(s.display, "text-[clamp(1.35rem,1.15rem+0.6vw,1.7rem)] !leading-[1.12]")}>{item.title}</h3>
                <p className={cx(s.muted, "mt-2 max-w-[52ch] text-[1rem] leading-relaxed [text-wrap:pretty]")}>{item.body}</p>
              </div>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer" className={cx(s.button, s.buttonGhost, "!min-h-[2.9rem] self-start !px-5 sm:self-center")}>
                  {item.linkLabel ?? "Details"} <Arrow />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

/* RSVP: wraps the shared RsvpForm (passed as children) ------------------------- */

export function RsvpSection({ section, ctx, children }: { section: Of<"rsvp">; ctx: SectionContext; children: ReactNode }) {
  const { props } = section;
  const slot = <div className={s.rsvpSlot}>{children}</div>;
  if (section.variant === "split") {
    return (
      <SectionShell section={section} ctx={ctx} label="RSVP" id={props.anchor}>
        <div className="grid items-start gap-x-16 gap-y-12 lg:grid-cols-12">
          <div className="lg:sticky lg:top-10 lg:col-span-5">
            <SectionHeader ctx={ctx} eyebrow="RSVP" heading={props.heading} align="start" compact>
              <p className={cx(s.lead, s.muted, "max-w-[30ch]")}>{props.description}</p>
              <dl className={cx("m-0 mt-6 grid w-full max-w-[24rem] gap-4 border-t pt-6", s.hairline)}>
                {props.reminder.map((item) => (
                  <div key={item.label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
                    <dt className={s.label}>{item.label}</dt>
                    <dd className="m-0 text-[1rem] leading-snug">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </SectionHeader>
          </div>
          <div className="lg:col-span-7">{slot}</div>
        </div>
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} label="RSVP" id={props.anchor}>
      <SectionHeader ctx={ctx} eyebrow="RSVP" heading={props.heading}>
        <p className={cx(s.lead, s.muted, "max-w-[34ch]")}>{props.description}</p>
      </SectionHeader>
      <div className="mx-auto mt-12 max-w-[40rem]">{slot}</div>
    </SectionShell>
  );
}

/* Closing ----------------------------------------------------------------- */

export function ClosingSection({ section, ctx }: { section: Of<"closing">; ctx: SectionContext }) {
  const { props } = section;
  const name = props.coupleNames ? `${props.coupleNames[0]} & ${props.coupleNames[1]}` : props.title;
  const facts = [props.dateLabel, props.venueName].filter(Boolean).join("  ·  ");
  if (section.variant === "marquee") {
    return (
      <SectionShell section={section} ctx={ctx} label="Closing" innerClassName="flex flex-col gap-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <p className={cx(s.display, s.italic, "max-w-[22ch] text-[clamp(1.8rem,1.4rem+1.6vw,3rem)] !leading-[1.05]")}>{props.line}</p>
          <p className={cx(s.label, s.numerals)}><bdi>{facts}</bdi></p>
        </div>
        <div className={cx(s.lineBg, "h-px w-full")} />
        <p aria-hidden="true" className={cx(s.display, s.wordmark, "!leading-[0.85]")} style={{ "--len": String(Math.max(name.length, 6)) } as CSSProperties}>{name}</p>
      </SectionShell>
    );
  }
  return (
    <SectionShell section={section} ctx={ctx} label="Closing" innerClassName="flex flex-col items-center text-center">
      <Ornament kind={ctx.style.ornament} />
      <p className={cx(s.display, s.italic, "mt-10 max-w-[20ch] text-[clamp(2.1rem,1.5rem+2.6vw,4rem)] !leading-[1.04]")}>{props.line}</p>
      <p className={cx(s.label, "mt-10")}>{name}</p>
      <p className={cx(s.muted, s.numerals, "mt-2 text-[0.95rem]")}><bdi>{facts}</bdi></p>
    </SectionShell>
  );
}

import type { DesignedSection, ScheduleItem } from "@/lib/event-design/types";
import s from "./event-sections.module.css";
import { SectionHeader, SectionShell, cx } from "./shell";
import type { SectionContext } from "./theme";

type ScheduleSection = Extract<DesignedSection, { kind: "schedule" }>;

function groupByDay(items: ScheduleItem[]) {
  const groups: { day?: string; items: ScheduleItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.day === item.day) last.items.push(item);
    else groups.push({ day: item.day, items: [item] });
  }
  return groups;
}

const WEEKDAYS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
/** "Wed" → "Wednesday"; anything else ("Day 1", "Friday") is shown as written. */
const dayName = (day: string) => WEEKDAYS[day.toLowerCase().replace(/\.$/, "")] ?? day;

function ItemBody({ item, className }: { item: ScheduleItem; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <h3 className={cx(s.display, s.h3)}>{item.title}</h3>
      {item.location ? <p className={cx(s.label, "mt-2")}>{item.location}</p> : null}
      {item.description ? <p className={cx(s.muted, "mt-3 max-w-[46ch] text-[1rem] leading-relaxed [text-wrap:pretty]")}>{item.description}</p> : null}
    </div>
  );
}

/* Editorial / minimal: a ruled agenda with times set as numerals in their own column. */
function AgendaSchedule({ section, ctx }: { section: ScheduleSection; ctx: SectionContext }) {
  const { props } = section;
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
        <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} compact className="lg:sticky lg:top-10 lg:col-span-4 lg:self-start" />
        <div className="lg:col-span-8">
          {groupByDay(props.items).map((group, groupIndex) => (
            <div key={`${group.day ?? "day"}-${groupIndex}`} className={cx(groupIndex > 0 && "mt-12")}>
              {props.multiDay && group.day ? <p className={cx(s.display, "mb-5 text-[clamp(1.6rem,1.3rem+0.9vw,2.1rem)] !leading-tight")}>{dayName(group.day)}</p> : null}
              <ol className="m-0 list-none p-0">
                {group.items.map((item) => (
                  <li key={`${item.time}-${item.title}`} className={cx("grid grid-cols-[minmax(5.5rem,0.32fr)_minmax(0,1fr)] gap-x-6 border-t py-7 sm:grid-cols-[minmax(8rem,0.3fr)_minmax(0,1fr)] sm:gap-x-10", s.hairlineStrong)}>
                    <p className={cx(s.display, s.numerals, s.accentText, "pt-0.5 text-[clamp(1.2rem,1rem+0.7vw,1.6rem)] !leading-tight")}><bdi>{item.time}</bdi></p>
                    <ItemBody item={item} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function Marker({ ctx, index }: { ctx: SectionContext; index: number }) {
  if (ctx.style.ornament === "squiggle") {
    return <span aria-hidden="true" className="block size-5 rounded-full border-[2.5px]" style={{ background: `var(--ev-pop-${(index % 5) + 1})`, borderColor: "var(--ev-ink)" }} />;
  }
  if (ctx.style.ornament === "deco") {
    return <span aria-hidden="true" className="block size-3 rotate-45 border" style={{ borderColor: "var(--ev-line)", background: "var(--ev-bg)" }} />;
  }
  return <span aria-hidden="true" className="block size-3 rounded-full border" style={{ borderColor: "var(--ev-line)", background: "var(--ev-bg)" }} />;
}

/* Romantic / playful / noir: a centered vertical timeline, times mirrored against the descriptions on wide screens. */
function TimelineSchedule({ section, ctx }: { section: ScheduleSection; ctx: SectionContext }) {
  const { props } = section;
  const playful = ctx.style.ornament === "squiggle";
  let index = 0;
  return (
    <SectionShell section={section} ctx={ctx} label={props.heading}>
      <SectionHeader ctx={ctx} eyebrow={props.eyebrow} heading={props.heading} />
      <div className="relative mx-auto mt-14 max-w-[54rem]">
        <span aria-hidden="true" className="absolute inset-y-2 start-[0.6rem] w-px md:start-1/2 rtl:md:translate-x-1/2 ltr:md:-translate-x-1/2" style={{ background: playful ? "var(--ev-ink)" : "color-mix(in srgb, var(--ev-line) 60%, transparent)", width: playful ? "2px" : "1px" }} />
        {groupByDay(props.items).map((group, groupIndex) => (
          <div key={`${group.day ?? "day"}-${groupIndex}`}>
            {props.multiDay && group.day ? (
              <p className={cx(s.label, "relative mb-8 flex md:justify-center", groupIndex > 0 && "mt-12")}>
                <span className="ms-9 px-4 py-1.5 md:ms-0" style={{ background: playful ? "var(--ev-ink)" : "var(--ev-bg)", color: playful ? "var(--ev-bg)" : undefined, borderRadius: playful ? "999px" : 0 }}>{dayName(group.day)}</span>
              </p>
            ) : null}
            <ol className="m-0 list-none p-0">
              {group.items.map((item) => {
                const position = index++;
                return (
                  <li key={`${item.time}-${item.title}`} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-5 pb-12 last:pb-0 md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] md:gap-x-10">
                    <div className="row-span-2 flex justify-center pt-2 md:col-start-2 md:row-span-1 md:row-start-1">
                      <Marker ctx={ctx} index={position} />
                    </div>
                    <p className={cx(s.display, s.numerals, s.accentText, "text-[clamp(1.3rem,1.1rem+0.7vw,1.75rem)] !leading-tight md:col-start-1 md:row-start-1 md:pt-0.5 md:text-end")}><bdi>{item.time}</bdi></p>
                    <ItemBody item={item} className={cx("mt-1 md:col-start-3 md:row-start-1 md:mt-0", playful && cx(s.card, s.stickerCard, "mt-3 p-5 md:mt-0"))} />
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ScheduleSection({ section, ctx }: { section: ScheduleSection; ctx: SectionContext }) {
  if (section.variant === "agenda") return <AgendaSchedule section={section} ctx={ctx} />;
  return <TimelineSchedule section={section} ctx={ctx} />;
}

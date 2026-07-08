import { ImageIcon } from "lucide-react";

type SampleInvitationTemplateProps = {
  imageAreaLabel: string;
  title?: string;
  subtitle?: string;
  date?: string;
  compact?: boolean;
};

export function SampleInvitationTemplate({
  imageAreaLabel,
  title,
  subtitle,
  date,
  compact = false,
}: SampleInvitationTemplateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.45rem] border border-dashed border-[color:var(--el-accent)]/20 bg-[radial-gradient(circle_at_50%_18%,rgba(var(--el-accent-rgb),0.12),transparent_16rem),linear-gradient(160deg,color-mix(in_srgb,var(--el-surface)_88%,white),var(--el-surface))] ${
        compact ? "aspect-[4/3]" : "aspect-[5/7]"
      }`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        {title ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--el-muted)]">
              {date ?? "You're invited"}
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] text-[color:var(--el-text)] sm:text-5xl">{title}</h1>
            {subtitle ? (
              <p className="mt-4 max-w-sm text-sm leading-7 text-[color:var(--el-text)]/58">{subtitle}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/70 text-[color:var(--el-accent)]/70">
              <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="mt-6 max-w-xs text-sm leading-7 text-[color:var(--el-text)]/55">{imageAreaLabel}</p>
          </>
        )}
      </div>
    </div>
  );
}

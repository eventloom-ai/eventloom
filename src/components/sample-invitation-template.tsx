import { ImageIcon } from "lucide-react";
import Image from "next/image";

type SampleInvitationTemplateProps = {
  imageAreaLabel: string;
  title?: string;
  subtitle?: string;
  date?: string;
  imageUrl?: string;
  compact?: boolean;
};

export function SampleInvitationTemplate({
  imageAreaLabel,
  title,
  subtitle,
  date,
  imageUrl,
  compact = false,
}: SampleInvitationTemplateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.45rem] border border-dashed border-[color:var(--el-accent)]/20 bg-[radial-gradient(circle_at_50%_18%,rgba(var(--el-accent-rgb),0.12),transparent_16rem),linear-gradient(160deg,color-mix(in_srgb,var(--el-surface)_88%,white),var(--el-surface))] ${
        compact ? "aspect-[4/3]" : "aspect-[5/7]"
      }`}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 760px" unoptimized />
      ) : null}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-10 text-center ${
          imageUrl ? "bg-gradient-to-t from-black/55 via-black/15 to-transparent text-white" : ""
        }`}
      >
        {title ? (
          <>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
                imageUrl ? "text-white/75" : "text-[color:var(--el-muted)]"
              }`}
            >
              {date ?? "You're invited"}
            </p>
            <h1
              className={`mt-5 font-display text-4xl leading-[1.05] sm:text-5xl ${
                imageUrl ? "text-white" : "text-[color:var(--el-text)]"
              }`}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className={`mt-4 max-w-sm text-sm leading-7 ${imageUrl ? "text-white/82" : "text-[color:var(--el-text)]/58"}`}>
                {subtitle}
              </p>
            ) : null}
          </>
        ) : imageUrl ? null : (
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

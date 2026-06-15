import { ImageIcon } from "lucide-react";

type SampleInvitationTemplateProps = {
  imageAreaLabel: string;
  compact?: boolean;
};

export function SampleInvitationTemplate({ imageAreaLabel, compact = false }: SampleInvitationTemplateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.45rem] border border-dashed border-[#6f3032]/20 bg-[radial-gradient(circle_at_50%_20%,rgba(217,163,160,0.14),transparent_16rem),linear-gradient(160deg,#fffaf5,#f3ebe3)] ${
        compact ? "aspect-[4/3]" : "aspect-[5/7]"
      }`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/70 text-[#6f3032]/70 shadow-sm">
          <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="mt-6 max-w-xs text-sm leading-7 text-[#1f1a17]/55">{imageAreaLabel}</p>
      </div>
    </div>
  );
}

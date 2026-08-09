import Image from "next/image";

type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <span className={["relative inline-block shrink-0 drop-shadow-[0_2px_4px_rgba(5,53,70,0.18)]", className].join(" ")} aria-hidden="true">
      <Image src="/brand/eventloom-envelope-mark-sticker.png" alt="" fill sizes="32px" className="object-contain" />
    </span>
  );
}

export function EventloomLogo({ className, markClassName = "size-8", showWordmark = true }: LogoProps) {
  return (
    <span className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <EventloomMark className={markClassName} />
      {showWordmark ? <span className="font-[family-name:var(--font-playfair)] text-[1.08em] font-medium leading-none tracking-[-0.055em]">Eventloom</span> : null}
    </span>
  );
}

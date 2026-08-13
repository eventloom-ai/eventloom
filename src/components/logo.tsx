type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={["shrink-0", className].join(" ")} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#b9d4c1" />
      <path
        d="M21.2 9.25H12.1c-.91 0-1.65.74-1.65 1.65v10.2c0 .91.74 1.65 1.65 1.65H21.2"
        stroke="#0b2d39"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.45 16h8.1" stroke="#0b2d39" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="21.15" cy="16" r="2.45" stroke="#0b2d39" strokeWidth="2.15" />
    </svg>
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

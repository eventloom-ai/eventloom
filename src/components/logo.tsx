type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={["shrink-0", className].join(" ")} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1a4f8b" />
      <path fill="#ffffff" d="M6 8.5h6L16 14.2 20 8.5h6V26h-6v-9.8L16 21.8 12 16.2V26H6z" />
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

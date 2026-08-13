type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={["shrink-0", className].join(" ")} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#fffaf3" />
      <path fill="#0b3e4e" d="M6 9c0-1.5 1.6-2.4 2.8-1.5L16 13l-5 3.7V8.5H6z" />
      <path fill="#b9d4c1" d="M21 8.5v8.2L16 13l7.2-5.5C24.4 6.6 26 7.5 26 9v2.3L21 8.5z" />
      <path fill="#155166" d="M6 24a2 2 0 0 0 2 2h3V16.7L6 13z" />
      <path fill="#3d8a76" d="M26 24V13l-5 3.7V26h3a2 2 0 0 0 2-2z" />
      <path fill="#0b2d39" d="M11 16.7V8.5L16 13l5-4.5v8.2L16 21.5z" />
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

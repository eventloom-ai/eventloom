type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/** A woven tide mark: an event's details coming together around one shared point. */
export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#155166" />
      <path
        d="M23 8H12.5A3.5 3.5 0 0 0 9 11.5v9A3.5 3.5 0 0 0 12.5 24H23"
        stroke="#F6F1E6"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 16h9.25" stroke="#F6F1E6" strokeWidth="2.25" strokeLinecap="round" />
      <circle cx="22.5" cy="16" r="3.4" fill="#B9D4C1" stroke="#F6F1E6" strokeWidth="1.5" />
      <circle cx="22.5" cy="16" r="1" fill="#155166" />
    </svg>
  );
}

export function EventloomLogo({ className, markClassName = "size-8", showWordmark = true }: LogoProps) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <EventloomMark className={markClassName} />
      {showWordmark ? <span className="tracking-tight">Eventloom</span> : null}
    </span>
  );
}

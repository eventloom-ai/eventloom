type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/**
 * Eventloom mark — a threaded “E” with a loom eye on the middle bar.
 * Suggests events woven together; stays clear at 24–32px.
 */
export function EventloomMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#6D28D9" />
      {/* Loom post + top/bottom weft forming the E spine */}
      <path
        d="M21.5 9H12.25c-.97 0-1.75.78-1.75 1.75v10.5c0 .97.78 1.75 1.75 1.75H21.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle weft through the loom eye */}
      <path d="M10.5 16h8.25" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      {/* Loom / needle eye — the signature detail */}
      <circle cx="21.25" cy="16" r="2.55" stroke="white" strokeWidth="2.2" />
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

"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import type { TurnstileAction } from "@/lib/security/turnstile-shared";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void };
  }
}

export function TurnstileWidget({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string;
  action: TurnstileAction;
  onToken: (token: string) => void;
}) {
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const rendered = useRef(false);

  useEffect(() => {
    if (!loaded || !siteKey || !containerRef.current || !window.turnstile || rendered.current) return;
    rendered.current = true;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
  }, [action, loaded, onToken, siteKey]);

  if (!siteKey) return null;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div id={`turnstile-${reactId.replaceAll(":", "")}`} ref={containerRef} /></>;
}

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
  resetKey = 0,
}: {
  siteKey: string;
  action: TurnstileAction;
  onToken: (token: string) => void;
  resetKey?: string | number;
}) {
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const rendered = useRef(false);
  const widgetId = useRef<string | null>(null);
  const previousResetKey = useRef(resetKey);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!loaded || !siteKey || !containerRef.current || !window.turnstile || rendered.current) return;
    rendered.current = true;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: (token: string) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
    });
  }, [action, loaded, siteKey]);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    onTokenRef.current("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div id={`turnstile-${reactId.replaceAll(":", "")}`} ref={containerRef} /></>;
}

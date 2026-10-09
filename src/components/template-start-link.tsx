"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSignedIn } from "@/hooks/use-signed-in";
import { eventDraftEntryPath } from "@/lib/event-entry";

/**
 * "Use this template": the same entry rule as the homepage prompt. Signed-in visitors go straight to the draft;
 * signed-out visitors go to sign up (or sign in when public signup is off) and come back to the draft afterwards.
 * Template pages are static, so the signed-in state is read from the session cookie in the browser after hydration;
 * the prerendered link is the signed-out one.
 */
export function TemplateStartLink({
  brief,
  authConfigured,
  signupEnabled,
  className,
  ariaLabel,
  children,
}: {
  brief: string;
  authConfigured: boolean;
  signupEnabled: boolean;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const signedIn = useSignedIn();
  const href = eventDraftEntryPath({ brief, authenticated: signedIn, authConfigured, signupEnabled });
  return (
    <Link href={href} prefetch={false} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

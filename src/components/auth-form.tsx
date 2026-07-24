"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { SIGNUP_UX_VERSION } from "@/lib/auth/signup-ux";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_ACTIONS } from "@/lib/security/turnstile-shared";

type AuthMode = "signin" | "signup";

export function AuthForm({
  mode,
  turnstileSiteKey = "",
  signupAvailable = true,
}: {
  mode: AuthMode;
  turnstileSiteKey?: string;
  signupAvailable?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeRedirectPath(searchParams.get("next"));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => searchParams.get("error") ?? "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const acceptanceRef = useRef<HTMLInputElement>(null);

  const continuingDraft = nextPath.startsWith("/app/events/new");
  const title = mode === "signup"
    ? "Save your event"
    : continuingDraft
      ? "Continue your event"
      : "Open your events";
  const subtitle = useMemo(
    () =>
      mode === "signup"
        ? "Add your email and password so your site does not get lost."
        : continuingDraft
          ? "Sign in and we’ll keep your description ready for an editable first draft."
          : "Sign in to keep working on your event sites.",
    [continuingDraft, mode],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setShowSignInHint(false);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured yet.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup" && password.length < 12) {
      setError("Use at least 12 characters for your password.");
      setIsSubmitting(false);
      return;
    }
    if (mode === "signup" && (!accepted || (turnstileSiteKey && !captchaToken))) {
      setError("Confirm the age and legal terms, then complete the security check.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), age_18_confirmed: true, legal_version: "2026-07-22-beta" },
          captchaToken: captchaToken || undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      setIsSubmitting(false);

      if (signUpError) {
        if (/already registered/i.test(signUpError.message)) {
          setShowSignInHint(true);
          setError("This email already has an account. Sign in with your existing password, or reset it below.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function signInWithGoogle() {
    setError("");
    setMessage("");
    if (mode === "signup" && !accepted) {
      setError("Confirm that you are 18 or older and accept the legal terms before continuing.");
      acceptanceRef.current?.focus();
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsSubmitting(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    setShowSignInHint(false);

    if (!email.trim()) {
      setError("Enter your email first, then choose reset password.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset email sent. Open the link in your inbox to choose a new password.");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
          Eventloom
        </Link>
        <h1 className="mt-8 text-[32px] font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">{subtitle}</p>
      </div>

      <form
        onSubmit={submit}
        data-signup-ux={mode === "signup" ? SIGNUP_UX_VERSION : undefined}
        className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
      >
        {mode === "signup" ? (
          <fieldset className="mb-6 rounded-2xl border border-[#0071e3]/15 bg-[#f5f9ff] p-4">
            <legend className="px-1 text-[13px] font-semibold text-[#1d1d1f]">Before you continue</legend>
            <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-[#424245]">
              <input
                ref={acceptanceRef}
                type="checkbox"
                checked={accepted}
                onChange={(event) => {
                  setAccepted(event.target.checked);
                  if (event.target.checked) setError("");
                }}
                className="mt-0.5 size-4 shrink-0 accent-[#0071e3]"
                required
              />
              <span>
                I am 18 or older and accept the{" "}
                <Link className="font-medium underline underline-offset-2" href="/legal/terms" target="_blank">Terms</Link>,{" "}
                <Link className="font-medium underline underline-offset-2" href="/legal/privacy" target="_blank">Privacy Policy</Link>, and{" "}
                <Link className="font-medium underline underline-offset-2" href="/legal/acceptable-use" target="_blank">Acceptable Use Policy</Link>.
              </span>
            </label>
            <p className="mt-2 pl-7 text-[12px] leading-5 text-[#6e6e73]">
              Required once to save your event with Google or email.
            </p>
          </fieldset>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/[0.12] bg-white py-3.5 text-[16px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.42 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.3.32-1.91V7.5H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.5l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.96 2.99 14.7 2 12 2a10 10 0 0 0-8.92 5.5l3.34 2.59C7.2 7.73 9.4 5.97 12 5.97Z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.14em] text-[#86868b]">
          <span className="h-px flex-1 bg-black/[0.08]" />
          or continue with email
          <span className="h-px flex-1 bg-black/[0.08]" />
        </div>

        {mode === "signup" ? (
          <label className="grid gap-2">
            <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
              placeholder="Alex Morgan"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className={`grid gap-2 ${mode === "signup" ? "mt-5" : ""}`}>
          <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="mt-5 grid gap-2">
          <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Password</span>
          <input
              type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
              placeholder={mode === "signup" ? "At least 12 characters" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="justify-self-start text-sm font-medium text-[#0071e3] hover:text-[#0077ed]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </label>

        {mode === "signup" ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[#6e6e73]">
            Use 12+ characters with a mix of uppercase, lowercase, numbers, and symbols.
          </p>
        ) : null}

        {mode === "signup" ? (
          <div className="mt-5 grid gap-4">
            <TurnstileWidget siteKey={turnstileSiteKey} action={TURNSTILE_ACTIONS.creatorSignup} onToken={setCaptchaToken} />
            {!turnstileSiteKey ? (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                Public signup remains disabled in production until Turnstile is configured.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
            <p>{error}</p>
            {showSignInHint ? (
              <p className="mt-2">
                <Link
                  className="font-medium text-[#0071e3] hover:text-[#0077ed]"
                  href={`/login?next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(email)}`}
                >
                  Go to sign in
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <p className="mt-5 rounded-xl bg-[#f0f7ff] px-4 py-3 text-[14px] text-[#0071e3]" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || (mode === "signup" && (!accepted || (Boolean(turnstileSiteKey) && !captchaToken)))}
          className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting
            ? "Please wait…"
            : mode === "signup"
              ? "Save and continue"
              : continuingDraft
                ? "Continue to my draft"
                : "Open my events"}
        </button>

        {mode === "signin" ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={resetPassword}
            className="mt-3 w-full rounded-full border border-black/[0.08] bg-[#fbfbfd] py-3 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Forgot password?
          </button>
        ) : null}
      </form>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-[#86868b]">
        Protected by secure authentication. Google sign-in is handled by Google; Eventloom never receives your Google password.
      </p>

      <p className="mt-6 text-center text-[14px] text-[#6e6e73]">
        {mode === "signup" ? (
          <>
            Already saved an event?{" "}
            <Link className="font-medium text-[#0071e3] hover:text-[#0077ed]" href={`/login?next=${encodeURIComponent(nextPath)}`}>
              Sign in
            </Link>
          </>
        ) : signupAvailable ? (
          <>
            First time here?{" "}
            <Link className="font-medium text-[#0071e3] hover:text-[#0077ed]" href={`/signup?next=${encodeURIComponent(nextPath)}`}>
              Save your event
            </Link>
          </>
        ) : (
          <>Eventloom is currently open to invited creators. New accounts will open after launch checks are complete.</>
        )}
      </p>
    </div>
  );
}

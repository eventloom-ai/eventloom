"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  const title = mode === "signup" ? "Create your account" : "Sign in";
  const subtitle = useMemo(
    () =>
      mode === "signup"
        ? "Save your event sites, manage RSVPs, and publish when you are ready."
        : "Welcome back. Pick up where you left off with your event sites.",
    [mode],
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

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
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
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/app")}`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox, then sign in with the new password.");
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
        className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
      >
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
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
            placeholder="At least 8 characters"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>

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
          disabled={isSubmitting}
          className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
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

      <p className="mt-6 text-center text-[14px] text-[#6e6e73]">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link className="font-medium text-[#0071e3] hover:text-[#0077ed]" href={`/login?next=${encodeURIComponent(nextPath)}`}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Eventloom?{" "}
            <Link className="font-medium text-[#0071e3] hover:text-[#0077ed]" href={`/signup?next=${encodeURIComponent(nextPath)}`}>
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { EventloomLogo } from "@/components/logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPreparing, setIsPreparing] = useState(true);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (isMounted) {
          setError("Authentication is not configured yet.");
          setIsPreparing(false);
        }
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (isMounted) {
            setError("This password reset link is invalid or expired. Request a new reset email from the sign in page.");
            setIsPreparing(false);
          }
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (isMounted) {
            setError("This password reset link is invalid or expired. Request a new reset email from the sign in page.");
            setIsPreparing(false);
          }
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (isMounted) {
            setError("Open the password reset link from your email, or request a new reset email from the sign in page.");
            setIsPreparing(false);
          }
          return;
        }
      }

      if (code || window.location.hash) {
        window.history.replaceState(null, "", "/auth/reset-password");
      }

      if (isMounted) {
        setCanResetPassword(true);
        setMessage("Enter a new password to finish resetting your account.");
        setIsPreparing(false);
      }
    }

    void prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="eventloom-app flex min-h-screen items-center justify-center px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex justify-center text-[17px] font-semibold text-[#302821]">
            <EventloomLogo markClassName="size-7" />
          </Link>
          <h1 className="mt-8 font-[family-name:var(--font-playfair)] text-[42px] font-medium tracking-[-0.05em]">Set a new password</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6d6055]">
            Choose a new password for your account, then continue to your events.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="eventloom-app-card rounded-[1.5rem] p-6 md:p-8"
        >
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6153]">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="eventloom-app-field rounded-xl border px-4 py-3.5 text-[17px] outline-none transition-all"
              autoComplete="new-password"
            />
          </label>

          <label className="mt-5 grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6153]">Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="eventloom-app-field rounded-xl border px-4 py-3.5 text-[17px] outline-none transition-all"
              autoComplete="new-password"
            />
          </label>

          {error ? (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {message && !error ? (
            <p className="mt-5 rounded-xl bg-[#f3e7d9] px-4 py-3 text-[14px] text-[#604139]" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPreparing || isSubmitting || !canResetPassword}
            className="eventloom-app-button-primary mt-6 w-full rounded-full py-3.5 text-[17px] font-medium transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPreparing ? "Checking link…" : isSubmitting ? "Saving…" : "Update password"}
          </button>

          {error ? (
            <p className="mt-5 text-center text-[14px] text-[#6e6e73]">
              <Link className="font-medium text-[#604139] underline decoration-[#c19a7d] underline-offset-4 hover:text-[#8a6153]" href="/login">
                Back to sign in
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}

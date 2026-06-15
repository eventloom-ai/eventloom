"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            Eventloom
          </Link>
          <h1 className="mt-8 text-[32px] font-semibold tracking-[-0.02em]">Set a new password</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">
            Choose a new password for your account, then continue to your events.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.04)] md:p-8"
        >
          <label className="grid gap-2">
            <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
              autoComplete="new-password"
            />
          </label>

          <label className="mt-5 grid gap-2">
            <span className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[17px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,113,227,0.12)]"
              autoComplete="new-password"
            />
          </label>

          {error ? (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-[17px] font-medium text-white transition-all hover:bg-[#0077ed] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

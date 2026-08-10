import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { SIGNUP_UX_VERSION } from "@/lib/auth/signup-ux";
import { env, publicSignupEnabled } from "@/lib/env";
import Link from "next/link";

export default function SignupPage() {
  if (!publicSignupEnabled()) {
    return <main className="eventloom-app grid min-h-screen place-items-center px-5 sm:px-8"><section className="max-w-lg text-center"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Invited beta</p><h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-medium leading-[0.94] tracking-[-0.05em]">New accounts are temporarily closed.</h1><p className="mt-5 leading-7 text-[#6d6055]">Existing creators can still sign in while we complete security and legal launch checks.</p><Link href="/login" className="eventloom-app-button-primary mt-8 inline-block rounded-full px-6 py-3 text-sm font-semibold">Sign in</Link></section></main>;
  }
  return (
    <main
      data-signup-ux={SIGNUP_UX_VERSION}
      className="eventloom-app flex min-h-screen items-center justify-center px-5 py-16 sm:px-8"
    >
      <Suspense>
        <AuthForm mode="signup" turnstileSiteKey={env.turnstileSiteKey()} />
      </Suspense>
    </main>
  );
}

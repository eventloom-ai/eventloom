import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { env, publicSignupEnabled } from "@/lib/env";
import Link from "next/link";

export default function SignupPage() {
  if (!publicSignupEnabled()) {
    return <main className="grid min-h-screen place-items-center bg-[#fbfbfd] px-6"><section className="max-w-lg text-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">Invited beta</p><h1 className="mt-3 text-4xl font-semibold">New accounts are temporarily closed.</h1><p className="mt-4 text-[#6e6e73]">Existing creators can still sign in while we complete security and legal launch checks.</p><Link href="/login" className="mt-6 inline-block rounded-full bg-[#1d1d1f] px-6 py-3 text-white">Sign in</Link></section></main>;
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-16">
      <Suspense>
        <AuthForm mode="signup" turnstileSiteKey={env.turnstileSiteKey()} />
      </Suspense>
    </main>
  );
}

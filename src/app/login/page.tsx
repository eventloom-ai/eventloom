import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { publicSignupEnabled } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-16">
      <Suspense>
        <AuthForm mode="signin" signupAvailable={publicSignupEnabled()} />
      </Suspense>
    </main>
  );
}

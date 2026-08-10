import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { publicSignupEnabled } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="eventloom-app flex min-h-screen items-center justify-center px-5 py-16 sm:px-8">
      <Suspense>
        <AuthForm mode="signin" signupAvailable={publicSignupEnabled()} />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-16">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-16">
      <Suspense>
        <AuthForm mode="signin" />
      </Suspense>
    </main>
  );
}

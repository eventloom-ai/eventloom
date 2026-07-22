import "server-only";

import type { User } from "@supabase/supabase-js";
import { mfaEnforcementEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  emailVerified: boolean;
  aal: string | null;
  nextAal: string | null;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const [{ data: userData, error: userError }, { data: assurance }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (userError || !userData.user) return null;
  return {
    user: userData.user,
    emailVerified: Boolean(userData.user.email_confirmed_at),
    aal: assurance?.currentLevel ?? null,
    nextAal: assurance?.nextLevel ?? null,
  };
}

export function hasRequiredMfa(context: AuthContext) {
  return !mfaEnforcementEnabled() || context.aal === "aal2";
}

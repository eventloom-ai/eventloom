// Next.js only inlines NEXT_PUBLIC_* vars when accessed statically.
// Do not read these through helpers — client bundles would ship empty values.
export const supabasePublicEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  key:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

export function hasSupabasePublicEnv() {
  return Boolean(supabasePublicEnv.url && supabasePublicEnv.key);
}

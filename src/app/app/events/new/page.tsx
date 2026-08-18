import { AppShell } from "@/components/app-shell";
import { NewEventStarter } from "@/components/new-event-starter";
import { SiteBuildStudio } from "@/components/site-build-studio";
import { redirect } from "next/navigation";
import { eventDraftPath } from "@/lib/event-entry";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { getServerUser } from "@/lib/supabase/server";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  const landingBrief = brief?.trim().slice(0, 8000) ?? "";
  const user = await getServerUser();
  const authConfigured = hasSupabasePublicEnv();
  if (authConfigured && !user) {
    redirect(`/login?next=${encodeURIComponent(eventDraftPath(landingBrief))}`);
  }

  if (!authConfigured) {
    return <SiteBuildStudio initialPrompt={landingBrief} variant="app" fullBleed />;
  }

  if (!landingBrief) {
    return <SiteBuildStudio variant="app" fullBleed />;
  }

  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title="New event"
      description="Describe your celebration, then shape every detail in the visual studio."
      width="wide"
    >
      <NewEventStarter initialBrief={landingBrief} />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { NewEventStarter } from "@/components/new-event-starter";
import { SiteBuildStudio } from "@/components/site-build-studio";
import { redirect } from "next/navigation";
import { eventDraftPath } from "@/lib/event-entry";
import { getServerUser } from "@/lib/supabase/server";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ brief?: string; ref?: string }> }) {
  const { brief, ref } = await searchParams;
  const landingBrief = brief?.trim().slice(0, 8000) ?? "";
  const referralJourney = ref?.trim().slice(0, 4_096) ?? "";
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(eventDraftPath(landingBrief, referralJourney))}`);
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
      <NewEventStarter initialBrief={landingBrief} referralJourney={referralJourney} />
    </AppShell>
  );
}

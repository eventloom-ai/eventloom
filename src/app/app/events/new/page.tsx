import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { NewEventStarter } from "@/components/new-event-starter";
import { SiteBuildStudio } from "@/components/site-build-studio";
import { redirect } from "next/navigation";
import { eventDraftPath } from "@/lib/event-entry";
import { getServerUser } from "@/lib/supabase/server";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  const landingBrief = brief?.trim().slice(0, 8000) ?? "";
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(eventDraftPath(landingBrief))}`);
  }

  if (!landingBrief) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <AppHeader active="events" />
        <main className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 sm:py-5">
          <SiteBuildStudio variant="app" />
        </main>
      </div>
    );
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

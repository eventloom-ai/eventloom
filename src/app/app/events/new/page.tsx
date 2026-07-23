import { AppShell } from "@/components/app-shell";
import { NewEventStarter } from "@/components/new-event-starter";
import { redirect } from "next/navigation";
import { eventDraftPath } from "@/lib/event-entry";
import { getServerUser } from "@/lib/supabase/server";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(eventDraftPath(brief))}`);
  }
  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title="New event"
      description="Describe your celebration, then shape every detail in the visual studio."
      width="wide"
    >
      <NewEventStarter initialBrief={brief?.slice(0, 8000)} />
    </AppShell>
  );
}

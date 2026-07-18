import { AppShell } from "@/components/app-shell";
import { NewEventStarter } from "@/components/new-event-starter";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
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

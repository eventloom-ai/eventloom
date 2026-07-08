import { AppShell } from "@/components/app-shell";
import { EventDraftRestorer } from "@/components/event-draft-restorer";
import { SiteBuildStudio } from "@/components/site-build-studio";

export default function NewEventPage() {
  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title="New event"
      description="Describe your celebration and watch Eventloom plan, design, and save your first version live."
      width="wide"
    >
      <EventDraftRestorer />
      <SiteBuildStudio />
    </AppShell>
  );
}

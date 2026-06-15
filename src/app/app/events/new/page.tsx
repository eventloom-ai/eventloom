import { AppShell } from "@/components/app-shell";
import { NewEventForm } from "@/components/new-event-form";

export default function NewEventPage() {
  return (
    <AppShell
      backHref="/app"
      backLabel="My events"
      title="New event"
      description="Describe your celebration and choose a link name. We'll create the first version for you."
      width="narrow"
    >
      <NewEventForm />
    </AppShell>
  );
}

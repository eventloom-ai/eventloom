import { AppShell } from "@/components/app-shell";
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
      <SiteBuildStudio />
    </AppShell>
  );
}

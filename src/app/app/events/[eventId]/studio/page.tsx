import { notFound, redirect } from "next/navigation";
import { VisualStudio } from "@/components/visual-studio";
import { isSupabaseConfigured } from "@/lib/env";
import { canEditEvent, loadStudioState } from "@/lib/studio-store";
import { getServerUser } from "@/lib/supabase/server";

export default async function EventStudioPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { eventId } = await params;
  const { notice } = await searchParams;
  const user = await getServerUser();
  if (isSupabaseConfigured() && !user) redirect(`/login?next=${encodeURIComponent(`/app/events/${eventId}/studio`)}`);
  if (!(await canEditEvent(eventId, user?.id ?? null))) notFound();
  const state = await loadStudioState(eventId, user?.id ?? null);
  if (!state) notFound();
  return <VisualStudio initialState={state} initialNotice={notice} />;
}

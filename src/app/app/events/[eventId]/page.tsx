import { redirect } from "next/navigation";

export default async function EventManagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(`/app/events/${eventId}/studio`);
}

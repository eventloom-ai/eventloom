import { redirect } from "next/navigation";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  redirect(`/app/events/new${brief ? `?brief=${encodeURIComponent(brief.slice(0, 8000))}` : ""}`);
}

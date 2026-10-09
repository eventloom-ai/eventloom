import { redirect } from "next/navigation";
import { MAX_BRIEF_CHARS } from "@/lib/prompt-limits";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const { brief } = await searchParams;
  redirect(`/app/events/new${brief ? `?brief=${encodeURIComponent(brief.slice(0, MAX_BRIEF_CHARS))}` : ""}`);
}

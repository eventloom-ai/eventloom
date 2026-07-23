import { Dashboard } from "@/components/dashboard";

export default async function AppPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <Dashboard filter={status === "published" ? "published" : "all"} />;
}

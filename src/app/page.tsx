import { LandingPage } from "@/components/landing-page";

export default async function Home({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  return <LandingPage initialTemplate={template} />;
}

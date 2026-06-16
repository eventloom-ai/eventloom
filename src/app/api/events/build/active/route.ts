import { NextResponse } from "next/server";
import { listActiveGenerationJobs } from "@/lib/agent/tools";
import { getServerUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ jobs: [] });
  }

  const jobs = await listActiveGenerationJobs(user.id);
  return NextResponse.json({ jobs });
}

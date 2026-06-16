import { NextRequest, NextResponse } from "next/server";
import { getGenerationJob } from "@/lib/agent/tools";
import { getServerUser } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const ownerId = (await getServerUser())?.id ?? null;
  const job = await getGenerationJob(jobId, ownerId);

  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

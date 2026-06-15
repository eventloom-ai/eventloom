import { NextResponse } from "next/server";
import { getAgentRuntime } from "@/lib/agent/runtime";

export async function GET() {
  const runtime = getAgentRuntime();
  return NextResponse.json(runtime);
}

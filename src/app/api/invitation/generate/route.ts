import { NextRequest, NextResponse } from "next/server";
import { generateInvitationImage } from "@/lib/ai/invitation-image";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const names = typeof body.names === "string" ? body.names : undefined;
  const style = typeof body.style === "string" ? body.style : undefined;

  const result = await generateInvitationImage({ names, style });
  return NextResponse.json(result);
}

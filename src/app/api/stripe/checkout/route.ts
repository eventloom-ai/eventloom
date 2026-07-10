import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { getServerUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { event_id?: string } | null;
  if (!body?.event_id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const session = await createLaunchCheckoutSession({ eventId: body.event_id, ownerId: user.id, customerEmail: user.email });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.error === "not_found" ? 404 : 409 });
  }

  return NextResponse.json(session);
}

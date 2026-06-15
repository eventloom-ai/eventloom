import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { domainSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { event_id?: string; domain?: string } | null;
  if (!body?.event_id || !body.domain) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const domain = domainSchema.safeParse(body.domain);
  if (!domain.success) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  const session = await createCheckoutSession({ eventId: body.event_id, domain: domain.data });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: 503 });
  }

  return NextResponse.json(session);
}

import { NextRequest, NextResponse } from "next/server";
import { canManageEvent } from "@/lib/organizations";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { getServerUser, serviceSupabase } from "@/lib/supabase/server";
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

  const client = serviceSupabase();
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (client) {
    const { data: event } = await client
      .from("events")
      .select("owner_id, organization_id")
      .eq("id", body.event_id)
      .maybeSingle();

    const canManage =
      event &&
      (await canManageEvent({
        userId: user.id,
        ownerId: event.owner_id,
        organizationId: event.organization_id,
      }));

    if (!canManage) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const session = await createCheckoutSession({ eventId: body.event_id, domain: domain.data });
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: 503 });
  }

  return NextResponse.json(session);
}

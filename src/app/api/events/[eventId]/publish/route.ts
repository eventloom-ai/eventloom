import { NextRequest, NextResponse } from "next/server";
import { createLaunchCheckoutSession } from "@/lib/payments/stripe";
import { getServerUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const checkout = await createLaunchCheckoutSession({ eventId, ownerId: user.id, customerEmail: user.email });
  if (!checkout.ok) {
    return NextResponse.json({ error: checkout.error }, { status: checkout.error === "not_found" ? 404 : 409 });
  }

  return NextResponse.redirect(checkout.url!, { status: 303 });
}

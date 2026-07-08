import type { User } from "@supabase/supabase-js";
import { serviceSupabase } from "@/lib/supabase/server";

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
};

type MembershipRow = {
  organization_id: string;
  organizations: OrganizationRecord | OrganizationRecord[] | null;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
};

function workspaceSlug(userId: string) {
  return `user-${userId.replaceAll("-", "").slice(0, 24)}`;
}

function workspaceName(profile: ProfileRow | null, user?: User | null) {
  const fullName = profile?.full_name?.trim() || user?.user_metadata?.full_name;
  const email = profile?.email || user?.email || "";
  const emailName = email.split("@")[0];
  const base = fullName || emailName || "Eventloom";

  return `${base}'s Workspace`;
}

function normalizeOrganization(value: OrganizationRecord | OrganizationRecord[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function getPrimaryOrganizationForUser(userId: string): Promise<OrganizationRecord | null> {
  const client = serviceSupabase();
  if (!client) return null;

  const { data } = await client
    .from("organization_members")
    .select("organization_id, organizations(id, name, slug, plan, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = data as MembershipRow | null;
  return normalizeOrganization(row?.organizations);
}

export async function isOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
  const client = serviceSupabase();
  if (!client) return false;

  const { data } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return Boolean(data);
}

export async function canManageEvent(input: {
  userId: string;
  ownerId?: string | null;
  organizationId?: string | null;
}) {
  if (input.ownerId === input.userId) return true;
  if (!input.organizationId) return false;

  return isOrganizationMember(input.userId, input.organizationId);
}

export async function ensureDefaultOrganizationForUser(user: User): Promise<OrganizationRecord | null> {
  const existing = await getPrimaryOrganizationForUser(user.id);
  if (existing) return existing;

  const client = serviceSupabase();
  if (!client) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: organization } = await client
    .from("organizations")
    .upsert(
      {
        name: workspaceName((profile as ProfileRow | null) ?? null, user),
        slug: workspaceSlug(user.id),
        billing_email: profile?.email ?? user.email ?? null,
        metadata: { source: "app_default_workspace", owner_id: user.id },
      },
      { onConflict: "slug" },
    )
    .select("id, name, slug, plan, status")
    .single();

  if (!organization) return null;

  await client.from("organization_members").upsert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
  });

  return organization as OrganizationRecord;
}

export async function ensureDefaultOrganizationForUserId(userId: string): Promise<OrganizationRecord | null> {
  const existing = await getPrimaryOrganizationForUser(userId);
  if (existing) return existing;

  const client = serviceSupabase();
  if (!client) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: organization } = await client
    .from("organizations")
    .upsert(
      {
        name: workspaceName((profile as ProfileRow | null) ?? null),
        slug: workspaceSlug(userId),
        billing_email: profile?.email ?? null,
        metadata: { source: "app_default_workspace", owner_id: userId },
      },
      { onConflict: "slug" },
    )
    .select("id, name, slug, plan, status")
    .single();

  if (!organization) return null;

  await client.from("organization_members").upsert({
    organization_id: organization.id,
    user_id: userId,
    role: "owner",
  });

  return organization as OrganizationRecord;
}

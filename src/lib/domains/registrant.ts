import "server-only";

import { z } from "zod";
import { decryptSensitiveJson, encryptSensitiveJson } from "@/lib/security/encryption";
import { serviceSupabase } from "@/lib/supabase/server";

export const domainRegistrantSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  organization: z.string().trim().max(120).default(""),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  address1: z.string().trim().min(3).max(160),
  address2: z.string().trim().max(160).default(""),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(2).max(20),
  country: z.enum(["CA", "US"]),
});
export type DomainRegistrant = z.infer<typeof domainRegistrantSchema>;

export async function storeRegistrantPayload(orderId: string, registrant: DomainRegistrant) {
  const client = serviceSupabase();
  const ciphertext = encryptSensitiveJson(registrant);
  if (!client || !ciphertext) return false;
  const { error } = await client.from("domain_registrant_payloads").insert({ order_id: orderId, ciphertext, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
  return !error;
}

export async function loadRegistrantPayload(orderId: string) {
  const client = serviceSupabase();
  if (!client) return null;
  const { data } = await client.from("domain_registrant_payloads").select("ciphertext, expires_at").eq("order_id", orderId).maybeSingle();
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null;
  const parsed = domainRegistrantSchema.safeParse(decryptSensitiveJson(data.ciphertext));
  return parsed.success ? parsed.data : null;
}

export async function deleteRegistrantPayload(orderId: string) {
  const client = serviceSupabase();
  if (client) await client.from("domain_registrant_payloads").delete().eq("order_id", orderId);
}

import { z } from "zod";
import { isReservedSlug } from "@/lib/reserved-slugs";
import type { DomainQuote } from "@/lib/types";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .min(3)
  .max(63)
  .refine((slug) => !isReservedSlug(slug), { message: "slug_reserved" });

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/)
  .max(253);

export const rsvpPayloadSchema = z.object({
  form_token: z.string().min(20).max(2_000),
  turnstile_token: z.string().max(2_000).default(""),
  idempotency_key: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  is_attending: z.boolean(),
  party_size: z.number().int().min(0).max(50),
  guest_names: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  answers: z.record(z.string(), z.string().max(500)).default({}),
});

export function validateRsvpPayload(input: unknown) {
  const parsed = rsvpPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid" };
  }

  const payload = parsed.data;
  if (!payload.is_attending && (payload.party_size !== 0 || payload.guest_names.length !== 0)) {
    return { ok: false as const, error: "invalid_not_attending" };
  }

  if (payload.is_attending && payload.party_size < 1) {
    return { ok: false as const, error: "invalid_party_size" };
  }

  if (payload.is_attending && payload.guest_names.length > 0 && payload.guest_names.length !== payload.party_size) {
    return { ok: false as const, error: "guest_count_mismatch" };
  }

  const unique = new Set(payload.guest_names.map((guest) => guest.toLowerCase().replace(/\s+/g, " ")));
  if (unique.size !== payload.guest_names.length) {
    return { ok: false as const, error: "duplicate_guest" };
  }

  return { ok: true as const, payload };
}

export function evaluateDomainQuote(quote: DomainQuote, capUsd: number) {
  if (!quote.available) {
    return { ok: false as const, reason: "unavailable" };
  }

  if (quote.premium) {
    return { ok: false as const, reason: "premium" };
  }

  if (quote.currency !== "USD") {
    return { ok: false as const, reason: "unsupported_currency" };
  }

  if (quote.registrationCost > capUsd) {
    return { ok: false as const, reason: "over_cap", overage: quote.registrationCost - capUsd };
  }

  return { ok: true as const };
}

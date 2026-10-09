// Client-safe legal constants. Kept apart from legal-documents.ts so client components (signup, studio
// checkout dialog) can send the current version without bundling every policy's text.
//
// Bumping LEGAL_VERSION requires a migration that inserts the new legal_documents rows as active and
// retires the old ones (see supabase/migrations/*_legal_documents_2026_10_09.sql and
// src/lib/tests/legal-documents.test.ts). Every creator is asked to accept again: hasCreatorLegalOnboarding
// compares profiles.legal_version with this value.
export const LEGAL_VERSION = "2026-10-09";
export const LEGAL_EFFECTIVE_DATE = "October 9, 2026";

export const LEGAL_BUSINESS = {
  name: "Eventloom",
  email: "hello@eventloom.co",
  mailingAddress: "335 Webb Dr, Mississauga, ON L5B 4A1, Canada",
  jurisdiction: "Ontario, Canada",
} as const;

/** Accepted once per version by every creator (signup, or /app/legal-acceptance). Mirrors /api/legal/accept and handle_new_user(). */
export const ONBOARDING_LEGAL_DOCUMENTS = ["terms", "privacy", "acceptable-use"] as const;
/** Accepted with every paid launch and recorded against the order. */
export const CHECKOUT_LEGAL_DOCUMENTS = ["terms", "privacy", "refunds"] as const;
/** Only if custom-domain purchase is ever offered. */
export const DOMAIN_CHECKOUT_LEGAL_DOCUMENTS = [...CHECKOUT_LEGAL_DOCUMENTS, "domains"] as const;
/** Documents that must be active at LEGAL_VERSION before the readiness gate passes. */
export const REQUIRED_ACTIVE_LEGAL_DOCUMENTS = ["terms", "privacy", "refunds", "acceptable-use", "domains"] as const;

/** Shown to existing creators when they are asked to accept the new version. */
export const LEGAL_VERSION_CHANGES = [
  "New Refund and Cancellation Policy for the $20 launch fee.",
  "Clearer rules on AI-generated content, your responsibility for your page, and how we moderate, review reports and suspend pages.",
  "New Copyright and Takedown policy and a Content Reporting and Enforcement page.",
  "Privacy Policy now lists exactly what we collect, every service provider we use, and how long we keep each kind of data.",
  "Our business name, contact email and mailing address are now in every policy.",
] as const;

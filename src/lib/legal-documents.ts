export const LEGAL_VERSION = "2026-07-22-beta";

export type LegalDocument = { slug: string; title: string; summary: string; sections: Array<{ heading: string; body: string }> };

export const legalDocuments: LegalDocument[] = [
  { slug: "terms", title: "Terms of Service", summary: "The rules for creating and operating Eventloom event sites.", sections: [
    { heading: "Eligibility and accounts", body: "Creators must be at least 18, provide accurate account information, secure their credentials and multi-factor authentication, and remain responsible for activity under their account." },
    { heading: "The service", body: "Eventloom provides tools for creating event sites, collecting guest replies, publishing, and optionally arranging domain registration. Creators remain responsible for their event, content, notices, guests, and compliance with law." },
    { heading: "Creator content and AI", body: "Creators confirm they own or have permission to use uploaded content and images. AI-generated material may be inaccurate or unsuitable and must be reviewed before publication. Creators retain their rights and grant Eventloom only the licence necessary to provide the service." },
    { heading: "Availability and termination", body: "The service may be suspended for security, legal, payment, abuse, or operational reasons. Liability limitations, governing law, dispute terms, and the final business identity require Ontario counsel approval before paid launch." },
  ]},
  { slug: "privacy", title: "Privacy Policy", summary: "How Eventloom handles creator, guest, security, and payment information.", sections: [
    { heading: "Roles and purposes", body: "For RSVP information, the event creator determines why the information is collected and Eventloom processes it on the creator’s behalf. Eventloom controls account, billing, fraud-prevention, support, and security information needed to operate the service." },
    { heading: "Data we process", body: "We process creator account details, event content, RSVP names and optional contact details, guests and answers, provider references, keyed network hashes, device class, and security events. Eventloom does not receive full card numbers from Stripe." },
    { heading: "Use and sharing", body: "Information is used to provide, secure, support, and bill for the service. Eventloom does not sell personal data, use RSVP data for marketing, or run behavioural advertising. Providers receive only data needed for their services." },
    { heading: "Location and retention", body: "The current database and several subprocessors operate in the United States, so information may be processed outside Canada. RSVP personal data is scheduled for deletion 90 days after the event unless a documented legal hold applies. Abuse data is kept 30 days, security logs 12 months, backups 30 days, and legally required payment records may be retained seven years." },
    { heading: "Rights and contact", body: "Creators and guests may request access, correction, deletion, or information about processing. Identity is verified before disclosure. Eventloom targets a response within 30 days, subject to lawful extensions and exceptions." },
  ]},
  { slug: "domains", title: "Domain Registration, Renewal, and Transfer Policy", summary: "Ownership and lifecycle rules for domains purchased through Eventloom.", sections: [
    { heading: "Registrant ownership", body: "The customer is registered as the registrant and beneficial owner. Accurate registrant data and verification are required. Eventloom does not claim ownership of customer domains." },
    { heading: "Renewal and expiry", body: "Automatic renewal is off initially. Renewal prices are shown separately and reminders are planned for 60, 30, 14, and 7 days before expiry. Failure to renew can cause service interruption or loss of the domain." },
    { heading: "Security and transfers", body: "Multi-factor authentication is required for contact changes, renewals, unlocks, and transfer codes. Transfer-out is supported after applicable registrar and ICANN locks." },
  ]},
  { slug: "acceptable-use", title: "Acceptable Use Policy", summary: "Content and activity prohibited on Eventloom.", sections: [
    { heading: "Prohibited activity", body: "Do not use Eventloom for unlawful, fraudulent, deceptive, harassing, hateful, exploitative, infringing, malware, phishing, spam, credential theft, or privacy-invasive activity. Do not probe, disrupt, evade limits, scrape personal information, or interfere with other tenants." },
    { heading: "Enforcement", body: "Eventloom may investigate, restrict, remove, preserve, or report content and accounts when reasonably necessary for safety, legal compliance, or service integrity. Appeals may be sent to support." },
  ]},
  { slug: "dpa", title: "Creator Data Processing Addendum", summary: "The baseline processor commitments for creator-controlled RSVP data.", sections: [
    { heading: "Instructions and safeguards", body: "Eventloom processes RSVP data only to provide the creator’s configured event service, applies access controls and appropriate technical safeguards, and requires relevant subprocessors to protect the information." },
    { heading: "Requests and incidents", body: "Eventloom assists creators with verified data-subject requests and will notify affected creators of a confirmed reportable incident without undue delay, subject to legal and investigative constraints." },
    { heading: "Deletion and audit", body: "RSVP data is scheduled for deletion 90 days after the event unless the creator has a lawful hold. The final DPA, liability allocation, transfer terms, and audit mechanism require counsel and provider-contract review before paid launch." },
  ]},
  { slug: "subprocessors", title: "Subprocessors and International Transfers", summary: "Providers expected to process service data.", sections: [
    { heading: "Current providers", body: "Supabase provides authentication, database, and storage in the United States; Vercel provides hosting and delivery; Stripe provides payment processing; OpenAI supports creator-requested generation; OpenSRS is planned for domain registration; Sentry is planned for privacy-scrubbed error monitoring; and a transactional email provider will deliver service messages." },
    { heading: "Changes", body: "Material subprocessor changes will be documented here. Production contracts, data-processing terms, processing locations, and transfer safeguards must be verified before enabling each provider." },
  ]},
  { slug: "cookies", title: "Cookie and Tracking Notice", summary: "Eventloom uses essential session and security storage only in v1.", sections: [
    { heading: "Essential technologies", body: "Authentication, session continuity, security, load balancing, and fraud prevention may require cookies or similar storage. These are not used for behavioural advertising." },
    { heading: "No nonessential tracking in v1", body: "Marketing, advertising, and nonessential analytics remain disabled. If introduced later, Eventloom will add consent, withdrawal, and applicable opt-out controls before activation." },
  ]},
  { slug: "accessibility", title: "Accessibility Statement", summary: "Eventloom aims for WCAG 2.2 Level AA.", sections: [
    { heading: "Commitment", body: "We aim to make creator and guest journeys perceivable, operable by keyboard, understandable, and compatible with assistive technology. Automated and manual testing is part of the release gate." },
    { heading: "Support", body: "If you encounter a barrier or need a different format or support accommodation, contact us with the page and preferred response method. Production contact details will be published before public checkout." },
  ]},
  { slug: "security", title: "Security and Responsible Disclosure", summary: "How Eventloom protects the service and receives vulnerability reports.", sections: [
    { heading: "Safeguards", body: "Eventloom uses tenant authorization, multi-factor authentication for sensitive creator operations, encrypted provider transport and storage, minimized logging, rate limits, signed webhooks, dependency scanning, backups, and monitored production changes." },
    { heading: "Report a vulnerability", body: "Send a concise report with affected URL, reproduction steps, impact, and contact information to the security contact. Do not access other people’s data, degrade the service, use social engineering, or publicly disclose an unresolved issue. A safe-harbour statement and production security mailbox will be finalized before launch." },
  ]},
];

export function legalDocument(slug: string) { return legalDocuments.find((document) => document.slug === slug); }

# Incident response runbook

1. Declare an incident, timestamp it, assign incident lead and communications lead, and open a restricted record containing identifiers but no RSVP content or secrets.
2. Contain: disable the smallest relevant feature flag, revoke affected sessions/credentials, block abusive sources, and preserve provider/audit evidence.
3. Assess affected tenants, data categories, jurisdictions, exposure window, likely harm, and whether the incident is a reportable breach. Do not copy raw RSVP or provider payloads into chat, tickets, or Sentry.
4. Recover from a known-good deployment or backup, verify tenant isolation and payment/domain state, rotate scoped credentials, and monitor for recurrence.
5. Notify affected creators without undue delay and coordinate guest/regulator notices with counsel. Maintain required Canadian breach records for at least two years.
6. Complete a blameless post-incident review, corrective actions with owners/deadlines, and a verification exercise before re-enabling the feature.

Emergency rollback order: public checkout → domains → AI generation → signup → public RSVP. Published static sites remain available where safe.

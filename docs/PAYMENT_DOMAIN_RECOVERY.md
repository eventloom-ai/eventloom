# Payment and domain recovery runbook

1. Locate the Stripe event, order, fulfillment job, and attempts by identifiers only. Never paste raw webhook payloads or registrant contacts into logs.
2. Verify Stripe signature/event status, order amount/currency/version, payment status, entitlement, published version, registrar state, and Vercel domain state.
3. Replay only an idempotent verified event. A 2xx is allowed only after database postconditions are visible.
4. If domain registration is pending, leave the site on its Eventloom subdomain and retry through the reconciler/provider workflow.
5. For permanent registration failure, refund only the domain line item through Stripe, mark fulfillment refunded/failed, delete the encrypted contact payload, notify the customer, and allow another domain choice.
6. For mismatched or orphaned payment state, disable checkout if systemic, reconcile all affected orders, and record the outcome in the audit trail.

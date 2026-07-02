# Eventloom Schema Redesign

`supabase/migrations/20260702000100_multi_tenant_rsvp_schema.sql` expands the original MVP schema without deleting or rewriting existing data.

## Goals

- Support many customers through organizations and organization memberships.
- Keep existing `events.owner_id`, RSVP submissions, guests, payments, and generated artifacts intact.
- Let the current app keep creating events while newer code moves to organization-aware ownership.
- Support both open RSVP links and invite-only RSVP workflows.
- Separate stable business data from generated page `config` JSON.

## New Model

- `organizations`: customer/workspace billing and ownership boundary.
- `organization_members`: users and roles inside each customer workspace.
- `events.organization_id`: links each event to a workspace while keeping `owner_id` for compatibility.
- `event_settings`: durable RSVP/event settings such as invite mode, locale, and max party size.
- `rsvp_forms`, `rsvp_fields`, `rsvp_field_options`: configurable RSVP form definitions per event.
- `invite_groups`: household/family/group invite links with codes, party limits, labels, language, and tags.
- `invitees`: known invited guests attached to invite groups.
- `orders`: future-proof purchase records for event sites, domains, upgrades, and add-ons.
- `audit_events`: platform activity trail for support and compliance.

## Backfill Behavior

The migration creates one organization per distinct existing `events.owner_id`, adds that user as the organization owner, and links their existing events to that organization.

Events without an owner are linked to an `Imported Events` organization. Existing RSVP submissions and guests are not deleted, moved, or rewritten. They receive optional links to the new default RSVP form where possible.

## Compatibility

Existing code that inserts an event with only `owner_id` still works. A trigger assigns the event to the owner user's first organization, creating one if needed.

Existing public RSVP writes continue to use `rsvp_submissions` and `rsvp_guests`. Newer code can progressively add `invite_group_id`, `form_id`, field-backed answers, and structured guest metadata.

## Recommended Next App Changes

- Update dashboard queries to scope by `organization_id`.
- Add an RSVP manager using `rsvp_submissions`, `rsvp_guests`, `invite_groups`, and `invitees`.
- Add invite-code URLs for invite-only events.
- Move uploaded images from JSON/data URLs into object storage.
- Use `orders` as the source of truth for paid products, then link Stripe payments to orders.

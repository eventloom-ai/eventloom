# Event site design system

Five styles (Editorial, Romantic, Modern Minimal, Playful, Luxe Noir) built from a hand-crafted section library (`src/components/event-sections/`) and a deterministic layout function (`designEventSite` in `src/lib/event-design/`). The AI acts as art director (picks style, palette, sections, writes copy); it never invents layout.

![Styles overview](design-styles-overview.jpg)

Preview locally (not available in production): run the `eventloom-demo` launch config and open `/design-preview`.

Approved by the owner on 2026-10-08 for rollout to all new events.

## Rollout

- Data: `EventConfig.design` (`{ version: 1, styleKey, paletteKey, content, sections? }`, zod schema in `src/lib/event-design/schema.ts`), stored in each `event_versions.config`. No migration.
- Rendering rule (public page, private preview): a valid `config.design` renders `EventSite`; anything else renders the legacy site document exactly as before. New events still get a composed site document as a fallback.
- Builds run an art-director step after the planner (`src/lib/agent/art-director.ts`); without a provider it falls back to `src/lib/event-design/style-choice.ts` (kind of event × intake mood).
- Studio: designed events edit one Puck component per section (`src/lib/puck-design.ts`); legacy events keep the old editor and can opt in with "Switch to the new designs". The assistant edits designed events with design patches (`src/lib/event-design/design-patch.ts`).

Demo-mode builds from the rollout check (`rollout/`): a wedding with an uploaded photo (Romantic, blush mood), a birthday without photos (Playful, sunset), a corporate offsite (Modern Minimal, navy), a black-tie gala (Luxe Noir, no mood), the studio after switching style and editing the title (persisted across reload), and the template gallery.

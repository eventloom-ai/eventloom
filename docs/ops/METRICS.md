# Metrics

| Date | Requests (7d) | Signups | Events built | Published | Revenue | Errors | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-08 | ~48 | ? | ? | ? | $0 | 0 logged | Checkout + RSVP disabled in production (N1); no Sentry |
| 2026-10-09 | n/a (3 log lines retained) | ? | ? | ? | $0 | 0 logged | Checkout + RSVP on in prod; Stripe not live yet; CLI log retention too short for traffic counts |
| 2026-10-09 | 3 logged (24h: 3; CDN hits not in CLI logs) | ? | ? | ? | $0 | 0 errors, 0 5xx (24h) | Daily ops: latest prod deploy Ready (16h ago, no Error deploys in 24h); CI green (last 5); DB migrations in sync; liveness 200/ok; prod audit clean. Traffic = a WP probe + crawler `/icon.png` 404 |

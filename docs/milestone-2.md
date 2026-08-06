# Milestone 2 — Data Architecture & Catalog Ordering

- Canonical schema shared by legacy and Cloudflare R2 tracks.
- Global release-date ordering with created/updated/sequence fallbacks.
- Latest Releases excludes future, upcoming, draft, archived and inactive tracks.
- Fallback dates are explicitly labeled.
- Recently Added is a separate import-date view.

# Changelog

All notable changes for POKE MNKY are documented here.

## [3.0.0] - 2026-02-28

### Added

- **Middleware**: Root `middleware.ts` for Supabase session refresh and route protection. `/admin/*` and `/dashboard/*` redirect to `/auth/login` when unauthenticated.
- **API error helper**: `lib/api-error.ts` with consistent shape `{ error: { code, message, details? } }` and helpers (`unauthorized()`, `badRequest()`, `validationError()`, `internalError()`, etc.). Used in draft, free agency, matches, Notion webhook, and legacy `lib/api-response.ts`.
- **Zod validation**: Request validation for matches GET (`lib/validation/matches.ts`), Notion webhook payload (`lib/validation/notion-webhook.ts`). Draft and free agency already used Zod; create-room unchanged.
- **Structured logging**: `lib/logger.ts` with level-based logging (LOG_LEVEL env; production default `warn`). Assistant and Notion webhook routes use logger instead of `console.log`/`console.error`.
- **Loading skeletons**: `loading.tsx` added for admin, draft, playoffs, showdown, profile, schedule, videos, calc, mvp, and matches/submit.
- **Design system doc**: `docs/DESIGN-SYSTEM.md` documenting tokens (colors, typography, radius), components (Shadcn, brand assets), and motion.
- **Unit tests**: Vitest config and tests for `lib/validation/draft`, `lib/validation/matches`, and `lib/api-error`.
- **E2E tests**: Playwright config and specs for standings page and auth redirect (dashboard/admin → login). CI workflow runs unit tests; E2E job runs after build + server start.

### Changed

- **Package**: Renamed from `my-v0-project` to `poke-mnky-v3`; version set to `3.0.0`.
- **README/AGENTS**: Version references updated to v3.
- **Notion webhook**: Error responses use `lib/api-error`; payload validated with Zod; logging via `lib/logger`.

### Production readiness

- Ensure no mock data is used in production: `lib/mock-data.ts` is for development/demos only; do not gate production code on mock flags.
- Set `LOG_LEVEL=warn` (or `error`) in production to reduce log volume.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (for admin) `SUPABASE_SERVICE_ROLE_KEY` must be set. See README for full list.

## [2.x] - Previous

See repository history for v2 and earlier changes.

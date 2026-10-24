# Upstream sync — 2026-10-24

Merge target: `gitroomhq/postiz-app` main at `ec2fbeb9` (October 24).
Previous upstream base: `3a7d28b7` (October 12). This brings in 157 upstream
commits, including release v2.25.2 and the security work merged after it.

## Security changes

- v2.25.2 addresses [PSA-2026-JNXM56](https://gadvisory.org/advisories/PSA-2026-JNXM56):
  `/integrations/function` now only runs provider methods marked
  `@DashboardFunction()`.
- Providers only open local media inside `UPLOAD_DIRECTORY`; the media
  controller and local storage reject paths outside it. Production stores
  media in R2, and no live media or queued post used a local path on
  2026-10-24.
- SSRF hardening for webhook URLs and post media.
- Dependency updates, including Next.js 16.3.1 → 16.4.2 (fixes unauthenticated
  RCE advisories GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw and
  GHSA-vcvr-r3jv-pc5j), sharp 0.35.5 and Node 22.23.4 in `Dockerfile.dev`.
- PostHog is removed; Sentry no longer sends default PII or AI prompts.

## Fork preservation

- MOV/QuickTime support keeps `isVideoFile` where upstream introduced
  mp4-only `hasExtension` checks, including the new media settings section.
- The branded root layout takes upstream's PostHog removal and self-hosted
  Plus Jakarta Sans font.
- `layout.component.tsx` and `proxy.ts` are protected by `merge=ours`, which
  had held back upstream mobile navigation, user timezone, Sentry user and
  invite/showorg cookie-lifetime fixes. Both are rebuilt from upstream with
  only the Rahiel legal footer and public legal routes re-applied.
- Upload test config uses `oxc` JSX settings for Vitest 4 / Vite 8. MOV
  publishing tests set `UPLOAD_DIRECTORY` to their fixture folder.

## Database

One additive change: nullable `User.timezoneName`.

## Validation

- Frozen-lockfile install, Prisma generate, backend, orchestrator and frontend
  production builds.
- Startup/release policy tests, 83 upload/media tests and 3 OAuth callback tests.

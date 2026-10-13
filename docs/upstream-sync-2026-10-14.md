# Upstream sync — 2026-10-14

Merge target: `gitroomhq/postiz-app` main at `3a7d28b7` (October 12).
Previous upstream base: `342f7003` (September 1). This brings in 453 upstream
commits, including releases v2.24.0, v2.25.0 and v2.25.1.

## Important changes for Rahiel

- Upload batches retain successful files when another fails, preserve in-flight
  uploads, cancel cleanly, and reject failed API responses. Failed multipart
  completion no longer falls through into a second response/error.
- Streamed uploads and bounded media reads improve memory use and prevent a
  stalled media read from hanging publishing. Local video serving supports Range
  requests again. Our R2 empty-body checksum fix remains present.
- Publishing errors are clearer across Instagram, Facebook, TikTok, X,
  Pinterest and other providers. Reconnecting a channel preserves an existing
  refresh token when the provider does not return another one.
- Preview comments support replies, resolution, anchored text and anonymous
  reviewers. Calendar filtering, published-post markers, channel naming and
  mobile layouts improve.
- Instagram Reel covers and TikTok cover timestamps are supported. TikTok
  upload drafts can be linked to their eventual published posts.
- v2.25.1 includes an upstream security advisory; see the release notes.
- Self-hosted MCP connectivity and media listing APIs improve. Optional RunPod
  normalization and clipping remain disabled unless their credentials/endpoints
  are deliberately configured.

## Fork preservation

Rahiel branding, legal pages, production compose configuration and existing
build/sync workflows are preserved. The newly introduced upstream staging
conflict resolver is kept under `.github/workflows-disabled/`, since it targets
an upstream staging branch and schedules paid automation every ten minutes.

The branded root layout now forwards upstream's Apple login, reCAPTCHA and media
processing settings; its protected merge policy otherwise omitted those new
context properties and caused the frontend type check to fail.

Existing uncommitted compose/documentation changes in the primary checkout are
outside this sync.

## Redeployment

Back up the production database before deploying this update. The Prisma schema
adds media processing status, clipping records, comment fields, channel names,
batch IDs, self-hosted OAuth authorization records, and AI storage tables/indexes.
The image runs `prisma-db-push` at startup. Upstream removed `--accept-data-loss`:
if Prisma flags a destructive change, startup should stop instead of silently
accepting it. Inspect the exact warning before proceeding.

Historical Temporal post workflow exports remain alongside the new versions.
No production database or running service was changed by this source sync.

New optional environment variables can stay unset. In particular,
`MCP_SELF_HOSTED_RELAY` is intended for Postiz Cloud and should remain unset here.

## Validation

- Frozen-lockfile installation and Prisma client generation on Node 22.
- Frontend production build, backend build and orchestrator build passed.
- Three R2 upload regression tests passed.
- Browser upload smoke tests passed for a 12 MiB MP4 in three parts and a PNG,
  using the merged production upload code and isolated local storage.
- Prisma schema validation and an offline old/new schema SQL diff passed. The
  diff contains no dropped tables or columns; this does not compare against the
  live database or establish that existing AI span keys are unique.
- Fork-owned deployment/legal files and existing workflows were checked for
  preservation. Whitespace warnings in imported upstream README/CLAUDE text were
  retained without unrelated formatting changes.

## Sources

- https://github.com/gitroomhq/postiz-app/releases/tag/v2.25.0
- https://github.com/gitroomhq/postiz-app/releases/tag/v2.25.1
- https://github.com/gitroomhq/postiz-app/commit/3a7d28b7

# Rahiel Studios Social Media Planner Deployment

This fork is intentionally thin: Rahiel branding/legal pages, a fork-owned Docker image, and a protected production compose file. Upstream Postiz changes are merged monthly by GitHub Actions.

## Image

```text
ghcr.io/omar7l/rahiel-social-media-planner:latest
```

## Deployment

The stack is no longer pinned to a separate `vps1` worker. The larger production server is the Swarm manager and can schedule the services directly.

Deploy as a Swarm/Portainer stack:

```bash
docker stack deploy -c docker-compose.yaml rahiel-planner
```

Verify services:

```bash
docker service ls
docker service ps rahiel-planner_postiz
docker service ps rahiel-planner_postiz-postgres
docker service ps rahiel-planner_temporal
```

## Required core environment

```env
MAIN_URL=https://planner.rahielstudios.ch
FRONTEND_URL=https://planner.rahielstudios.ch
NEXT_PUBLIC_BACKEND_URL=https://planner.rahielstudios.ch/api
POSTGRES_PASSWORD=change-me
JWT_SECRET=change-me-long-random
DISABLE_REGISTRATION=true
```

## Email / invites

Invites, activation emails, and password reset emails require an email provider.

Preferred: Resend. MAS Auto uses the same simple pattern: one `RESEND_API_KEY` plus a verified sender address. In Postiz the variable names are slightly different from the MAS website (`EMAIL_FROM_*` instead of `MAIL_FROM`).

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM_NAME=Rahiel Studios
EMAIL_FROM_ADDRESS=planner@rahielstudios.ch
```

SMTP fallback:

```env
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM_NAME=Rahiel Studios
EMAIL_FROM_ADDRESS=planner@rahielstudios.ch
```

## Storage

Default local uploads:

```env
STORAGE_PROVIDER=local
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads
```

Cloudflare R2 for uploaded media:

```env
STORAGE_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=8bc2abad28773a3cc1077e3cf93784f3
CLOUDFLARE_ACCESS_KEY=<r2-access-key-id>
CLOUDFLARE_SECRET_ACCESS_KEY=<r2-secret-access-key>
CLOUDFLARE_REGION=auto
CLOUDFLARE_BUCKETNAME=social-planner
CLOUDFLARE_BUCKET_URL=https://pub-49af1116e1fe4d6693e180820cdd9455.r2.dev
NEXT_PUBLIC_UPLOAD_DIRECTORY=https://pub-49af1116e1fe4d6693e180820cdd9455.r2.dev
```

Use the public `r2.dev` URL or a custom public bucket domain for `CLOUDFLARE_BUCKET_URL`. Do not use the private S3 API endpoint there; browsers need a public media URL.

In the production compose, the non-secret R2 values are hard-coded. Only `CLOUDFLARE_ACCESS_KEY`, `CLOUDFLARE_SECRET_ACCESS_KEY`, and `RESEND_API_KEY` must be supplied as stack environment variables/secrets.

R2 replaces only uploaded media storage. It does **not** replace Postgres, Redis, Temporal Postgres, or Temporal Elasticsearch.

Keep the `postiz-uploads` volume mounted during the first R2 switch until uploads are verified.

## Registration

For normal operation:

```env
DISABLE_REGISTRATION=true
```

Invite links still allow invited users to create/login into an account and join the existing organization. Public self-serve registration stays disabled for everyone else.

To onboard users manually, temporarily set:

```env
DISABLE_REGISTRATION=false
```

Create/activate users, then switch it back to `true`. Public registration should not stay open longer than necessary.

## Legal pages

Public routes in the app:

```text
/privacy
/terms
/deletion
```

These use text from `../internal/legal-pages/html/` and are protected in `.gitattributes` so monthly upstream sync keeps the Rahiel versions.

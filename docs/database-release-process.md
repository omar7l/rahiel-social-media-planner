# Database-aware releases

## Automatic upstream sync

The monthly workflow proposes upstream changes in a PR. It never pushes the
merge to `main` or publishes an image. If another sync PR is open, it waits for
that review. Database checks are explicitly dispatched on the proposed branch,
because PRs created with `GITHUB_TOKEN` do not trigger another automatic run.
GitHub's repository setting allowing Actions to create PRs must be enabled.

## Checks before publishing

Every `main` image release identifies the Git revision in the image currently
tagged `latest` in GHCR, using its OCI revision label or legacy
`NEXT_PUBLIC_VERSION` environment variable. If the revision cannot be identified,
publication stops. This baseline persists across failed/held releases: an
unrelated follow-up commit cannot hide a pending database change.

Before building the candidate image, CI:

1. Exports the baseline schema and generates an SQL difference report.
2. Initializes PostgreSQL 17 from that baseline, seeds synthetic application
   records and a populated runtime-created AI table, then runs the candidate's
   real `prisma-db-push` startup command.
3. Verifies that the fixture records survived the upgrade unchanged.
4. Runs restart/idempotence, duplicates, fresh-install, data-loss protection,
   upload and release-policy regressions.

All tests use disposable local databases. Production credentials and backups
are not uploaded to GitHub. The generated SQL is attached as an Actions artifact,
and the job summary identifies the baseline and review requirement.

The previous Docker build still validates frontend/backend/orchestrator
compilation. Database checks must pass before this build can publish anything.

## Database changes cannot silently move latest

After checks pass, an image is published under its exact Git SHA. Changes to the
database schema, database code, SQL files, container startup, dependencies or lockfile
require explicit review before that image can also become `latest`.

For a held database release:

1. Review the PR/release notes and the **database-upgrade-report** SQL artifact.
2. Back up the deployed database and confirm the backup can be restored.
3. Restore that backup into isolated staging and test the candidate upgrade,
   startup and application behavior there. Synthetic CI fixtures do not cover
   every production-specific row or schema drift.
4. Run **Publish Docker image** manually on `main`, checking both
   **database_reviewed** and **backup_confirmed**. This re-runs the checks; the
   confirmations cannot override a test or build failure.
5. Wait for the workflow summary to confirm that `latest` was updated, then
   redeploy the existing Dokploy service and check startup logs, login, API and
   a test upload.

For changes outside the database-sensitive paths, `latest` may advance after
all checks and the image build pass. Workflows on other branches cannot promote
`latest`.

The baseline is the last **published** image, not proof of what Dokploy currently
runs. If the deployed instance is older, explicitly run **Database upgrade
checks** with that deployed Git SHA as `baseline_ref` before upgrading it, and
include that older deployment in the staging restore test.

Prefer an exact image tag in Dokploy rather than `latest` when planning a
controlled production release:

```yaml
image: ghcr.io/omar7l/rahiel-social-media-planner:<full-git-sha>
```

Keep the previous image reference and backup. An image rollback alone does not
undo a database migration. Keep data-loss protection enabled; fix flagged
constraints with explicit, tested migrations instead of blanket acceptance.

## Local verification

Release-policy tests need no database:

```sh
node --test tests/release/policy.test.cjs
```

For an upgrade check, start an empty disposable local PostgreSQL database whose
name begins with `planner_schema_test`, set `SCHEMA_TEST_DATABASE_URL`, export
the desired baseline schema with `git show`, then run:

```sh
node scripts/check-schema-upgrade.cjs /path/to/baseline.prisma
node --test tests/schema/startup.test.cjs
```

The checked-in startup tests and release policy are required CI steps. Future
database behavior changes should add representative fixtures/regressions here.

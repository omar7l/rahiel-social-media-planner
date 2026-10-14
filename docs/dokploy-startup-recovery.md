# Dokploy startup recovery — Mastra experiment index

The October upstream sync can encounter an existing Mastra-created
`mastra_experiment_results` table containing rows but missing the unique index
`idx_experiment_results_exp_item_attempt`. Prisma reports a generic data-loss
warning when it plans that index, even if the rows are already unique. Its
nonzero exit stops the application container, and Dokploy may then answer
`404 page not found` because no running planner route remains.

The first index-only recovery missed older runtime tables without an `attempt`
column: it skipped them while still logging that the index was checked. This
reproduces the second failure reported from Dokploy.

`prisma-db-push` first runs `scripts/prepare-mastra-schema.cjs`. For existing
tables, the preflight adds the nullable integer `attempt` column if absent,
leaving all previous attempts unknown (`NULL`), then creates the unique index.
Rows with the same experiment/item and unknown attempts remain valid.
PostgreSQL verifies existing non-null attempts
atomically; actual duplicates fail without deleting or modifying those rows.
The preflight verifies the installed index definition before reporting success.
It reports a missing table separately, rather than claiming to have checked an
index that does not exist.
The transaction has lock and statement timeouts and serializes concurrent
planner preflights. Fresh installs leave table creation to Prisma. Normal
`prisma db push` follows, with no global acceptance of data-loss warnings.

Follow the [database release process](database-release-process.md) before
promoting the tested candidate to `latest`, then redeploy the existing Dokploy
Compose service. Raw Compose mode works; changing source mode is not
required. Preserve the service identity, volumes, environment variables and
domain target (`postiz`, internal port `5000`).

If the preflight reports PostgreSQL error `23505`, actual duplicate attempts
exist. Inspect them before deciding how to repair them; do not delete rows or
enable blanket `--accept-data-loss` as a workaround:

```sql
SELECT "experimentId", "itemId", "attempt", count(*)
FROM public.mastra_experiment_results
WHERE "attempt" IS NOT NULL
GROUP BY "experimentId", "itemId", "attempt"
HAVING count(*) > 1;
```

The startup fix was tested against PostgreSQL 17 with populated tables both
with and without `attempt`, duplicate known attempts, unknown legacy attempts,
repeat startup, an incorrectly defined index, a missing table and an unrelated
destructive-change warning. Production data was not accessed during these tests.

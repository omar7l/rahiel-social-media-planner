# Dokploy startup recovery — Mastra experiment index

The October upstream sync can encounter an existing Mastra-created
`mastra_experiment_results` table containing rows but missing the unique index
`idx_experiment_results_exp_item_attempt`. Prisma reports a generic data-loss
warning when it plans that index, even if the rows are already unique. Its
nonzero exit stops the application container, and Dokploy may then answer
`404 page not found` because no running planner route remains.

`prisma-db-push` now first runs `scripts/prepare-mastra-schema.cjs`. The preflight
creates only that missing unique index. PostgreSQL verifies existing rows
atomically; actual duplicates fail without deleting or modifying those rows.
The transaction has lock and statement timeouts and serializes concurrent
planner preflights. Fresh installs leave table creation to Prisma. Normal
`prisma db push` follows, with no global acceptance of data-loss warnings.

Redeploy the updated GHCR image in the existing Dokploy Compose service after
its image build succeeds. Raw Compose mode works; changing source mode is not
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

The startup fix was tested against PostgreSQL 17 with populated tables,
duplicates, repeat startup, a missing table and an unrelated destructive-change
warning. Production data was not accessed during these tests.

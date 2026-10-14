const { PrismaClient } = require('@prisma/client');

// Mastra can create this table before Prisma owns its schema. Prisma refuses
// to add a unique index to a populated table without accepting *all* data-loss
// warnings. Add only this index instead: Postgres checks every existing row
// and rolls the statement back if duplicates exist. Never delete/deduplicate.
async function prepareMastraSchema(db) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '15s'");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '120s'");
      // Serialize simultaneous planner starts while this one-time index is built.
      await tx.$executeRawUnsafe(
        'SELECT 1 FROM pg_advisory_xact_lock(179182, 20261014)'
      );
      const columns = await tx.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'mastra_experiment_results'
        AND column_name IN ('experimentId', 'itemId', 'attempt')
    `);
      // Fresh installs (or older schemas missing these columns) use normal db push.
      if (columns.length !== 3) return;
      await tx.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_experiment_results_exp_item_attempt"
      ON "mastra_experiment_results" ("experimentId", "itemId", "attempt")
    `);
    },
    { timeout: 125000 }
  );
}

if (require.main === module) {
  const db = new PrismaClient();
  prepareMastraSchema(db)
    .then(() => console.log('[schema-preflight] Mastra unique index checked.'))
    .catch((error) => {
      const code = error.meta?.code || error.code || 'unknown';
      console.error(
        '[schema-preflight] Could not prepare the Mastra experiment index. ' +
          'No rows were deleted. Check for duplicate (experimentId, itemId, attempt) ' +
          `values, database locks, or connection errors. Database error: ${code}`
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}

module.exports = { prepareMastraSchema };

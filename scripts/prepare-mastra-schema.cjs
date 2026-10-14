const { PrismaClient } = require('@prisma/client');

// Mastra can create this table before Prisma owns its schema. Prisma refuses
// to add a unique index to a populated table without accepting *all* data-loss
// warnings. Older runtime tables also lack the nullable `attempt` column.
// Add that column and this index explicitly, preserving existing rows. Postgres
// checks uniqueness atomically; never delete/deduplicate or invent attempts.
async function prepareMastraSchema(db) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '15s'");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '120s'");
      // Serialize simultaneous planner starts while this one-time index is built.
      await tx.$executeRawUnsafe(
        'SELECT 1 FROM pg_advisory_xact_lock(179182, 20261014)'
      );
      const [target] = await tx.$queryRawUnsafe(`
        SELECT current_schema() AS schema_name,
          to_regclass(format('%I.%I', current_schema(), 'mastra_experiment_results'))::text AS table_name
      `);
      if (!target.schema_name) throw new Error('No database schema selected.');
      if (!target.table_name)
        return { schema: target.schema_name, tableAbsent: true };
      const table = `"${target.schema_name.replace(
        /"/g,
        '""'
      )}"."mastra_experiment_results"`;
      const columns = await tx.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'mastra_experiment_results'
        AND column_name IN ('experimentId', 'itemId', 'attempt')
    `);
      const names = columns.map((column) => column.column_name);
      if (!names.includes('experimentId') || !names.includes('itemId'))
        throw new Error('Existing Mastra table lacks experimentId or itemId.');
      const attemptAdded = !names.includes('attempt');
      if (attemptAdded)
        await tx.$executeRawUnsafe(
          `ALTER TABLE ${table} ADD COLUMN "attempt" INTEGER`
        );
      await tx.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_experiment_results_exp_item_attempt"
      ON ${table} ("experimentId", "itemId", "attempt")
    `);
      // IF NOT EXISTS alone can silently accept an unrelated index with the
      // same name. Only report success after checking what Postgres installed.
      const [index] = await tx.$queryRawUnsafe(
        `
        SELECT i.indisunique AND i.indisvalid AND i.indisready
          AND NOT i.indnullsnotdistinct
          AND i.indpred IS NULL AND i.indexprs IS NULL
          AND i.indnkeyatts = 3 AND i.indnatts = 3
          AND am.amname = 'btree'
          AND pg_get_indexdef(i.indexrelid, 1, true) = '"experimentId"'
          AND pg_get_indexdef(i.indexrelid, 2, true) = '"itemId"'
          AND pg_get_indexdef(i.indexrelid, 3, true) = 'attempt'
          AS matches
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_am am ON am.oid = c.relam
        WHERE n.nspname = current_schema()
          AND c.relname = 'idx_experiment_results_exp_item_attempt'
          AND i.indrelid = to_regclass($1)
      `,
        table
      );
      if (!index?.matches)
        throw new Error('Mastra index exists with an unexpected definition.');
      return { schema: target.schema_name, attemptAdded, tableAbsent: false };
    },
    { timeout: 125000 }
  );
}

if (require.main === module) {
  const db = new PrismaClient();
  prepareMastraSchema(db)
    .then((result) => {
      if (result.tableAbsent)
        console.log(
          `[schema-preflight] Mastra table absent in schema ${result.schema}; Prisma will create it.`
        );
      else
        console.log(
          `[schema-preflight] Mastra schema ${
            result.schema
          }: nullable attempt ${
            result.attemptAdded ? 'added' : 'already present'
          }; unique index verified.`
        );
    })
    .catch((error) => {
      const code = error.meta?.code || error.code || 'unknown';
      console.error(
        '[schema-preflight] Could not prepare the Mastra experiment index. ' +
          'No rows were deleted. Check for duplicate (experimentId, itemId, attempt) ' +
          `values, unexpected schema/index definitions, database locks, or connection errors. Database error: ${code}`
      );
      if (!error.meta?.code && !error.code) console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}

module.exports = { prepareMastraSchema };

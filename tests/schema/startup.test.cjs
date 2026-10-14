const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.SCHEMA_TEST_DATABASE_URL;

function isolatedDb() {
  const url = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.ok(url.pathname.startsWith('/planner_schema_test'));
  return new PrismaClient({ datasourceUrl: databaseUrl });
}

function startup(url) {
  return spawnSync('pnpm', ['run', 'prisma-db-push'], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
    timeout: 120000,
  });
}

test(
  'startup upgrades a populated Mastra table without accepting data loss',
  {
    skip: !databaseUrl,
  },
  async () => {
    const db = isolatedDb();
    try {
      await db.$executeRawUnsafe(
        'DROP INDEX IF EXISTS "idx_experiment_results_exp_item_attempt"'
      );
      await db.$executeRawUnsafe('TRUNCATE "mastra_experiment_results"');
      await db.$executeRawUnsafe(`
      INSERT INTO "mastra_experiment_results"
        (id, "experimentId", "itemId", input, "startedAt", "completedAt", "retryCount", "createdAt", attempt)
      VALUES ('fixture', 'experiment', 'item', '{}', now(), now(), 0, now(), 1)
    `);
      const result = startup(databaseUrl);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const rows = await db.$queryRawUnsafe(
        'SELECT id FROM "mastra_experiment_results"'
      );
      assert.deepEqual(rows, [{ id: 'fixture' }]);
      const repeated = startup(databaseUrl);
      assert.equal(repeated.status, 0, repeated.stdout + repeated.stderr);
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  'actual duplicate attempts stop startup without deleting rows',
  {
    skip: !databaseUrl,
  },
  async () => {
    const db = isolatedDb();
    try {
      await db.$executeRawUnsafe(
        'DROP INDEX IF EXISTS "idx_experiment_results_exp_item_attempt"'
      );
      await db.$executeRawUnsafe('TRUNCATE "mastra_experiment_results"');
      await db.$executeRawUnsafe(`
      INSERT INTO "mastra_experiment_results"
        (id, "experimentId", "itemId", input, "startedAt", "completedAt", "retryCount", "createdAt", attempt)
      VALUES
        ('duplicate-1', 'experiment', 'item', '{}', now(), now(), 0, now(), 1),
        ('duplicate-2', 'experiment', 'item', '{}', now(), now(), 0, now(), 1)
    `);
      const result = startup(databaseUrl);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /No rows were deleted/);
      const rows = await db.$queryRawUnsafe(
        'SELECT id FROM "mastra_experiment_results" ORDER BY id'
      );
      assert.deepEqual(rows, [{ id: 'duplicate-1' }, { id: 'duplicate-2' }]);
      const index = await db.$queryRawUnsafe(
        `SELECT to_regclass('idx_experiment_results_exp_item_attempt')::text AS name`
      );
      assert.equal(index[0].name, null);
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  'fresh installs work when the Mastra table does not exist',
  {
    skip: !databaseUrl,
  },
  async () => {
    const db = isolatedDb();
    try {
      await db.$executeRawUnsafe('DROP TABLE "mastra_experiment_results"');
      const result = startup(databaseUrl);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const rows = await db.$queryRawUnsafe(
        'SELECT id FROM "mastra_experiment_results"'
      );
      assert.deepEqual(rows, []);
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  'unrelated destructive schema changes remain blocked',
  {
    skip: !databaseUrl,
  },
  async () => {
    const db = isolatedDb();
    try {
      await db.$executeRawUnsafe(
        'ALTER TABLE "mastra_experiment_results" ADD COLUMN "protected_test_value" TEXT'
      );
      await db.$executeRawUnsafe(`
      INSERT INTO "mastra_experiment_results"
        (id, "experimentId", "itemId", input, "startedAt", "completedAt", "retryCount", "createdAt", attempt, protected_test_value)
      VALUES ('protected', 'experiment', 'item', '{}', now(), now(), 0, now(), 1, 'keep-me')
    `);
      const result = startup(databaseUrl);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /data loss/);
      const rows = await db.$queryRawUnsafe(
        'SELECT protected_test_value FROM "mastra_experiment_results"'
      );
      assert.deepEqual(rows, [{ protected_test_value: 'keep-me' }]);
    } finally {
      await db.$disconnect();
    }
  }
);

const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const url = process.env.SCHEMA_TEST_DATABASE_URL;
const baseline = process.argv[2];
if (!url || !baseline)
  throw new Error(
    'Provide SCHEMA_TEST_DATABASE_URL and a baseline schema file.'
  );
const parsed = new URL(url);
assert.ok(['localhost', '127.0.0.1'].includes(parsed.hostname));
assert.ok(parsed.pathname.startsWith('/planner_schema_test'));

function run(args) {
  const result = spawnSync('pnpm', args, {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
    timeout: 180000,
  });
  if (result.status !== 0)
    throw new Error(
      'Database upgrade command failed. Image release is blocked.'
    );
}

async function snapshot(db) {
  const queries = {
    user: 'SELECT id, email FROM "User" ORDER BY id',
    organization: 'SELECT id, name FROM "Organization" ORDER BY id',
    membership:
      'SELECT id, "userId", "organizationId", role FROM "UserOrganization" ORDER BY id',
    channel: 'SELECT id, token FROM "Integration" ORDER BY id',
    post: 'SELECT id, content, state FROM "Post" ORDER BY id',
    media: 'SELECT id, path FROM "Media" ORDER BY id',
    comment: 'SELECT id, content FROM "Comments" ORDER BY id',
    tag: 'SELECT "postId", "tagId" FROM "TagsPosts" ORDER BY "postId", "tagId"',
    experiment:
      'SELECT id, "experimentId", "itemId", attempt FROM mastra_experiment_results ORDER BY id',
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries))
    result[name] = await db.$queryRawUnsafe(sql);
  return result;
}

async function check() {
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const existing = await db.$queryRawUnsafe(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()'
    );
    assert.equal(
      existing.length,
      0,
      'Upgrade checks require an empty disposable database.'
    );
    run([
      'exec',
      'prisma',
      'db',
      'push',
      '--schema',
      baseline,
      '--skip-generate',
    ]);
    // Synthetic data only. No production backup or credentials are used in CI.
    const seed = [
      `INSERT INTO "Organization" (id, name, "updatedAt") VALUES ('test-org', 'Upgrade fixture', now())`,
      `INSERT INTO "User" (id, email, "providerName", timezone, "updatedAt") VALUES ('test-user', 'fixture@example.test', 'LOCAL', 0, now())`,
      `INSERT INTO "UserOrganization" (id, "userId", "organizationId", role, "updatedAt") VALUES ('test-membership', 'test-user', 'test-org', 'ADMIN', now())`,
      `INSERT INTO "Integration" (id, "internalId", "organizationId", name, "providerIdentifier", type, token, "updatedAt") VALUES ('test-channel', 'fixture', 'test-org', 'Fixture channel', 'instagram', 'social', 'synthetic-token', now())`,
      `INSERT INTO "Post" (id, "publishDate", "organizationId", "integrationId", content, "group", "updatedAt") VALUES ('test-post', now(), 'test-org', 'test-channel', 'Keep this scheduled post', 'test-group', now())`,
      `INSERT INTO "Media" (id, name, path, "organizationId", "updatedAt") VALUES ('test-media', 'fixture.mp4', 'https://media.example.test/fixture.mp4', 'test-org', now())`,
      `INSERT INTO "Comments" (id, content, "organizationId", "postId", "userId", "updatedAt") VALUES ('test-comment', 'Keep this review', 'test-org', 'test-post', 'test-user', now())`,
      `INSERT INTO "Tags" (id, name, color, "orgId", "updatedAt") VALUES ('test-tag', 'Fixture', '#123456', 'test-org', now())`,
      `INSERT INTO "TagsPosts" ("postId", "tagId", "updatedAt") VALUES ('test-post', 'test-tag', now())`,
      `CREATE TABLE IF NOT EXISTS mastra_experiment_results (
        id text PRIMARY KEY, "experimentId" text NOT NULL, "itemId" text NOT NULL,
        input jsonb NOT NULL, "startedAt" timestamp NOT NULL, "completedAt" timestamp NOT NULL,
        "retryCount" integer NOT NULL, "createdAt" timestamp NOT NULL, attempt integer
      )`,
      // Model the runtime-created table that caused the October restart loop.
      `DROP INDEX IF EXISTS idx_experiment_results_exp_item_attempt`,
      `INSERT INTO mastra_experiment_results (id, "experimentId", "itemId", input, "startedAt", "completedAt", "retryCount", "createdAt", attempt) VALUES ('test-experiment', 'fixture', 'item', '{}', now(), now(), 0, now(), 1)`,
    ];
    for (const sql of seed) await db.$executeRawUnsafe(sql);
    const before = await snapshot(db);
    run(['run', 'prisma-db-push']);
    assert.deepEqual(
      await snapshot(db),
      before,
      'The database upgrade changed existing fixture data.'
    );
    console.log(
      'Populated database upgrade passed; fixture records were preserved.'
    );
  } finally {
    await db.$disconnect();
  }
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

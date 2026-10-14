const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  imageRevision,
  requiresDatabaseReview,
  mayPublishLatest,
} = require('../../scripts/release-policy.cjs');

const sha = 'a'.repeat(40);
test('reads the baseline from the actual released image', () => {
  assert.equal(
    imageRevision({ config: { Env: [`NEXT_PUBLIC_VERSION=rahiel-${sha}`] } }),
    sha
  );
  assert.equal(
    imageRevision({
      config: { Labels: { 'org.opencontainers.image.revision': sha } },
    }),
    sha
  );
});
test('an unknown or contradictory released image blocks release', () => {
  assert.throws(() => imageRevision({ config: {} }), /revision/);
  assert.throws(
    () =>
      imageRevision({ config: { Env: ['NEXT_PUBLIC_VERSION=rahiel-main'] } }),
    /revision/
  );
  assert.throws(
    () =>
      imageRevision({
        config: {
          Env: [`NEXT_PUBLIC_VERSION=rahiel-${sha}`],
          Labels: { 'org.opencontainers.image.revision': 'b'.repeat(40) },
        },
      }),
    /revision/
  );
});
test('detects additive and destructive schema changes', () => {
  assert.equal(
    requiresDatabaseReview('-- This is an empty migration.\n', []),
    false
  );
  assert.equal(
    requiresDatabaseReview(
      '-- CreateIndex\nCREATE UNIQUE INDEX example ON t(a);',
      []
    ),
    true
  );
  assert.equal(
    requiresDatabaseReview('ALTER TABLE t DROP COLUMN a;', []),
    true
  );
});
test('database startup and dependency changes also require review', () => {
  assert.equal(
    requiresDatabaseReview('', ['scripts/prepare-mastra-schema.cjs']),
    true
  );
  assert.equal(requiresDatabaseReview('', ['package.json']), true);
  assert.equal(requiresDatabaseReview('', ['pnpm-lock.yaml']), true);
  assert.equal(requiresDatabaseReview('', ['Dockerfile.dev']), true);
  assert.equal(requiresDatabaseReview('', ['migrations/new-index.sql']), true);
  assert.equal(
    requiresDatabaseReview('', [
      'apps/frontend/src/components/media/new.uploader.tsx',
    ]),
    false
  );
});
test('routine releases can publish latest on main', () => {
  assert.equal(
    mayPublishLatest({
      ref: 'refs/heads/main',
      reviewRequired: false,
      event: 'push',
    }),
    true
  );
});
test('database releases cannot silently advance latest', () => {
  const release = {
    ref: 'refs/heads/main',
    reviewRequired: true,
    event: 'push',
  };
  assert.equal(mayPublishLatest(release), false);
  assert.equal(
    mayPublishLatest({ ...release, reviewed: true, backupConfirmed: true }),
    false
  );
  assert.equal(
    mayPublishLatest({
      ...release,
      event: 'workflow_dispatch',
      reviewed: true,
    }),
    false
  );
  assert.equal(
    mayPublishLatest({
      ...release,
      event: 'workflow_dispatch',
      backupConfirmed: true,
    }),
    false
  );
  assert.equal(
    mayPublishLatest({
      ...release,
      event: 'workflow_dispatch',
      reviewed: 'false',
      backupConfirmed: true,
    }),
    false
  );
  assert.equal(
    mayPublishLatest({
      ...release,
      event: 'workflow_dispatch',
      reviewed: true,
      backupConfirmed: true,
    }),
    true
  );
});
test('branches never publish latest', () => {
  assert.equal(
    mayPublishLatest({
      ref: 'refs/heads/sync/upstream',
      reviewRequired: false,
      event: 'workflow_dispatch',
      reviewed: true,
      backupConfirmed: true,
    }),
    false
  );
});

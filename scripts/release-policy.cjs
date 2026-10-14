const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

function imageRevision(image) {
  const config = image.config || {};
  const label = config.Labels?.['org.opencontainers.image.revision'];
  const version = config.Env?.find((entry) =>
    entry.startsWith('NEXT_PUBLIC_VERSION=')
  );
  const legacy = version?.match(
    /^NEXT_PUBLIC_VERSION=rahiel-([a-f0-9]{40})$/
  )?.[1];
  const revision = label || legacy;
  if (
    !/^[a-f0-9]{40}$/.test(revision || '') ||
    (label && legacy && label !== legacy)
  ) {
    throw new Error(
      'Cannot determine a consistent Git revision from the released image. Release blocked.'
    );
  }
  return revision;
}

function requiresDatabaseReview(sql, paths) {
  const statements = sql.replace(/^\s*--.*$/gm, '').trim();
  return (
    !!statements ||
    paths.some(
      (path) =>
        path === 'package.json' ||
        path === 'pnpm-lock.yaml' ||
        path.startsWith('libraries/nestjs-libraries/src/database/') ||
        path.startsWith('scripts/prepare-')
    )
  );
}

function mayPublishLatest({
  ref,
  reviewRequired,
  event,
  reviewed,
  backupConfirmed,
}) {
  return (
    ref === 'refs/heads/main' &&
    (!reviewRequired ||
      (event === 'workflow_dispatch' &&
        reviewed === true &&
        backupConfirmed === true))
  );
}

if (require.main === module) {
  const [command, filename, baseline] = process.argv.slice(2);
  if (command === 'image-revision') {
    process.stdout.write(
      imageRevision(JSON.parse(fs.readFileSync(filename, 'utf8')))
    );
  } else if (command === 'assess') {
    if (!/^[a-f0-9]{40}$/.test(baseline || ''))
      throw new Error('Invalid baseline revision');
    const paths = execFileSync(
      'git',
      ['diff', '--name-only', baseline, 'HEAD'],
      { encoding: 'utf8' }
    )
      .trim()
      .split('\n');
    const sql = fs.readFileSync(filename, 'utf8');
    const reviewRequired = requiresDatabaseReview(sql, paths);
    const publishLatest = mayPublishLatest({
      ref: process.env.GITHUB_REF,
      reviewRequired,
      event: process.env.GITHUB_EVENT_NAME,
      reviewed: process.env.DATABASE_REVIEWED === 'true',
      backupConfirmed: process.env.BACKUP_CONFIRMED === 'true',
    });
    const outputs = `database_review_required=${reviewRequired}\npublish_latest=${publishLatest}\n`;
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);
    else process.stdout.write(outputs);
    const summary =
      `## Database release check\n\nBaseline image revision: \`${baseline}\`\n\n` +
      `Database review required: **${reviewRequired}**\n\n` +
      `Eligible to update \`latest\` after all checks pass: **${publishLatest}**\n\n` +
      'The SQL report is attached as an artifact. Database releases require manual dispatch with database review and backup confirmation.\n';
    if (process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  } else {
    throw new Error(
      'Usage: release-policy.cjs image-revision image.json | assess schema-diff.sql BASE_SHA'
    );
  }
}

module.exports = { imageRevision, requiresDatabaseReview, mayPublishLatest };

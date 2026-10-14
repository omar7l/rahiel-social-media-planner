# Schema startup regression tests

These tests reproduce the Dokploy restart loop caused by a populated
`mastra_experiment_results` table missing the Prisma-owned unique index.
They require Node 22 and a disposable local PostgreSQL database. Tests refuse
remote hosts and database names without the `planner_schema_test` prefix.

```sh
createdb -h 127.0.0.1 planner_schema_test
export SCHEMA_TEST_DATABASE_URL=postgresql://127.0.0.1/planner_schema_test
DATABASE_URL="$SCHEMA_TEST_DATABASE_URL" pnpm exec prisma db push --skip-generate --schema libraries/nestjs-libraries/src/database/prisma/schema.prisma
node --test tests/schema/startup.test.cjs
```

The tests modify this disposable database. They cover the exact startup command,
idempotence, duplicate-row preservation, fresh tables and refusal to accept an
unrelated populated-column deletion. They skip when the test URL is unset.

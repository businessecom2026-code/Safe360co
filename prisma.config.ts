import { defineConfig } from 'prisma/config';

// Internal SQLite by default (no external service required).
// Set DATABASE_URL to a postgresql:// string to switch to PostgreSQL.
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') ||
                   process.env.DATABASE_URL?.startsWith('postgres');

export default defineConfig({
  datasource: {
    url: isPostgres
      ? process.env.DATABASE_URL!
      : (process.env.DATABASE_URL ?? 'file:./safe360-prod.db'),
  },
});

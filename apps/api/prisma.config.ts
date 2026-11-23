import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Neon: use the direct connection for migrations; keep the pooled URL for the app.
// DATABASE_URL fallback also supports local PostgreSQL with a single connection URL.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error('Missing DIRECT_URL or DATABASE_URL in apps/api/.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: migrationUrl },
});

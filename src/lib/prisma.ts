import { PrismaClient } from '@prisma/client';

// Resolve the database URL from the most common env var names used by Vercel
// and local development so the app won't crash on cold start when a different
// name (e.g. POSTGRES_PRISMA_URL) is provided.
const resolvedDatabaseUrl =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!resolvedDatabaseUrl) {
  throw new Error(
    'Database URL not configured. Set POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL.'
  );
}

// Prisma reads the value from the env var defined in schema.prisma (POSTGRES_URL),
// so align it with the resolved URL before creating the client.
process.env.POSTGRES_URL = resolvedDatabaseUrl;

export const prisma = new PrismaClient();

console.log('🗄️ Database connected');

import { PrismaClient } from '@prisma/client';

// Normalize Vercel/hosting database environment variables to the Prisma
// expected `DATABASE_URL`. This handles both pooled and non-pooled
// connection strings that providers like Vercel Postgres expose.
if (!process.env.DATABASE_URL) {
  const fallbackUrl =
    process.env.POSTGRES_PRISMA_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (fallbackUrl) {
    process.env.DATABASE_URL = fallbackUrl;
  }
}

export const prisma = new PrismaClient();

console.log('🗄️ Database connected');

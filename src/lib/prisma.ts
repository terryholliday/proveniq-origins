import { PrismaClient } from '@prisma/client';

// Use local SQLite for development
// Turso will be configured in Vercel via environment variables
export const prisma = new PrismaClient();

console.log('🗄️ Database connected');

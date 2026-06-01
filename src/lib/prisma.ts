import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create a connection pool using the standard pg library
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
let poolConfig: any = { connectionString };

try {
  // If we are connecting to a remote database (like Supabase), we must ensure strict TLS is disabled
  // because Supabase poolers often return self-signed certificates. We use URL parser to extract
  // the configuration safely and enforce `ssl: { rejectUnauthorized: false }`.
  if (connectionString && !connectionString.includes('localhost')) {
    const url = new URL(connectionString);
    poolConfig = {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    };
  }
} catch (e) {
  console.warn("Failed to parse database URL, falling back to connectionString");
}

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

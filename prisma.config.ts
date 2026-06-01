import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables (Next.js loads .env.local with highest priority)
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const databaseUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});

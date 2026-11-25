import { defineConfig } from 'drizzle-kit';
export default defineConfig({ schema: './src/db/schema.ts', dialect: 'postgresql', dbCredentials: { url: process.env.DATABASE_URL!, ssl: /supabase\.(com|co)/.test(process.env.DATABASE_URL ?? '') ? { rejectUnauthorized: false } : false } });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
const g = globalThis as unknown as { _pool?: Pool };
const url = process.env.DATABASE_URL ?? '';
const ssl = process.env.DB_SSL === '1' || /supabase\.(com|co)/.test(url) ? { rejectUnauthorized: false } : undefined; // Supabase يفرض SSL
const pool = g._pool ?? new Pool({ connectionString: url, ssl, max: process.env.VERCEL ? 1 : 10 });
g._pool = pool;
export const db = drizzle(pool, { schema });
export { schema };

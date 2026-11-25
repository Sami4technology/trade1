import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { getSession } from './session';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function audit(action: string, entity: string, ref: string, details = '', tx: any = db, as?: { uid: number; name: string }) {
  try {
    let uid = as?.uid ?? null, name = as?.name ?? null;
    if (!as) { const se = await getSession(); if (se) { uid = se.uid; const [u] = await db.select({ n: s.users.name }).from(s.users).where(eq(s.users.id, se.uid)); name = u?.n ?? null; } }
    await tx.insert(s.auditLog).values({ userId: uid, userName: name, action, entity, ref, details });
  } catch (e) { if (tx !== db) throw e; }
}

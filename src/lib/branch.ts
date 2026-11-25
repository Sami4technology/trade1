import { cookies } from 'next/headers';
import { db, schema as s } from '@/db';
import { eq } from 'drizzle-orm';
import { getSession } from './session';
export async function currentBranch() {
  const se = await getSession(); if (se?.role === 'branch' && se.branchId) return se.branchId;
  const v = (await cookies()).get('branch')?.value;
  return v && v !== 'all' && !isNaN(Number(v)) ? Number(v) : null;
}
export async function allBranches() {
  const se = await getSession();
  if (se?.role === 'branch' && se.branchId) return db.select().from(s.branches).where(eq(s.branches.id, se.branchId));
  return db.select().from(s.branches).orderBy(s.branches.id);
}
export async function canAccess(branchId: number) { const se = await getSession(); return !(se?.role === 'branch' && se.branchId !== branchId); }
export async function visibleTreasuries() {
  const se = await getSession(); const all = await db.select().from(s.treasury).orderBy(s.treasury.id);
  return se?.role === 'branch' && se.branchId ? all.filter((t) => t.branchId === null || t.branchId === se.branchId) : all;
}

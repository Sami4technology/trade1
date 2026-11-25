import { and, eq, sql } from 'drizzle-orm';
import { schema as s } from '@/db';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;
export async function moveStock(tx: Tx, o: { productId: number; branchId: number; qty: number; type: string; ref?: string; unitCost?: number; note?: string | null }) {
  const [r] = await tx.insert(s.stock).values({ productId: o.productId, branchId: o.branchId, qty: String(o.qty) })
    .onConflictDoUpdate({ target: [s.stock.productId, s.stock.branchId], set: { qty: sql`${s.stock.qty} + ${o.qty}` } }).returning({ qty: s.stock.qty });
  if (Number(r.qty) < 0) { const [p] = await tx.select({ n: s.products.name }).from(s.products).where(eq(s.products.id, o.productId)); throw new Error(`الكمية غير كافية في هذا الفرع للصنف: ${p?.n}`); }
  await tx.insert(s.stockMovements).values({ productId: o.productId, branchId: o.branchId, qty: String(o.qty), type: o.type, ref: o.ref, unitCost: String(o.unitCost ?? 0), note: o.note ?? null });
}
export async function totalQty(tx: Tx, productId: number) {
  const [r] = await tx.select({ q: sql<string>`coalesce(sum(${s.stock.qty}),0)` }).from(s.stock).where(eq(s.stock.productId, productId));
  return Number(r.q);
}
export async function receiveWithAvg(tx: Tx, o: { productId: number; branchId: number; qty: number; unitCost: number; ref: string }) {
  const [p] = await tx.select().from(s.products).where(eq(s.products.id, o.productId));
  const have = Math.max(await totalQty(tx, o.productId), 0);
  const avg = have + o.qty > 0 ? (have * Number(p.avgCost) + o.qty * o.unitCost) / (have + o.qty) : o.unitCost;
  await tx.update(s.products).set({ avgCost: avg.toFixed(2) }).where(eq(s.products.id, o.productId));
  await moveStock(tx, { productId: o.productId, branchId: o.branchId, qty: o.qty, type: 'purchase', ref: o.ref, unitCost: o.unitCost });
}
export { and };

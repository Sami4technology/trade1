import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { canAccess } from '@/lib/branch';
import { Card, PageHeader, Table, Td } from '@/components/ui';
import StocktakeForm from '@/components/StocktakeForm';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function StocktakeDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [r] = await db.select({ t: s.stocktakes, br: s.branches.name }).from(s.stocktakes).innerJoin(s.branches, eq(s.branches.id, s.stocktakes.branchId)).where(eq(s.stocktakes.id, id)); if (!r || !(await canAccess(r.t.branchId))) notFound();
  const rows = await db.select({ i: s.stocktakeItems, p: s.products }).from(s.stocktakeItems).innerJoin(s.products, eq(s.products.id, s.stocktakeItems.productId)).where(eq(s.stocktakeItems.stocktakeId, id)).orderBy(s.products.code);
  const posted = r.t.status === 'posted';
  return (<div className="max-w-5xl"><PageHeader title={`جرد ${r.t.number} — ${r.br}`} /><p className="mb-3 text-sm text-gray-600">{fmtDate(r.t.date)} · {posted ? 'مُعتمد' : 'جارٍ'}</p>
    {posted ? <Table head={['الكود', 'الصنف', 'بالنظام', 'الفعلي', 'الفرق']}>{rows.filter((x) => x.i.countedQty !== null).map(({ i, p }) => { const d = Number(i.countedQty) - Number(i.systemQty); return <tr key={i.id}><Td>{p.code}</Td><Td>{p.name}</Td><Td>{Number(i.systemQty)}</Td><Td>{Number(i.countedQty)}</Td><Td className={d === 0 ? 'text-green-700' : 'font-semibold text-red-600'}>{d > 0 ? `+${d}` : d}</Td></tr>; })}</Table>
      : <Card><StocktakeForm id={id} rows={rows.map(({ i, p }) => ({ productId: p.id, code: p.code, name: p.name, unit: p.unit, barcode: p.barcode, system: Number(i.systemQty), counted: i.countedQty === null ? '' : String(Number(i.countedQty)) }))} /></Card>}</div>);
}

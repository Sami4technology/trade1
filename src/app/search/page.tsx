import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Card, PageHeader } from '@/components/ui';
export const dynamic = 'force-dynamic';
type R = { id: number; a: string; b: string };
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim(); const br = await currentBranch();
  const bf = (col: string) => (br ? sql.raw(` and ${col}=${br}`) : sql``);
  let groups: [string, string, R[]][] = [];
  if (q.length >= 1) {
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const run = async (query: ReturnType<typeof sql>) => (await db.execute(query)).rows as unknown as R[];
    const [products, parties, sales, purchases, assets, wos, rentals, quotes] = await Promise.all([
      run(sql`select id, code as a, name as b from products where active and (code ilike ${like} or name ilike ${like} or barcode ilike ${like}) order by name limit 8`),
      run(sql`select id, name as a, coalesce(phone,'') as b from parties where name ilike ${like} or phone ilike ${like} order by name limit 8`),
      run(sql`select i.id, i.number as a, coalesce(p.name,'نقدي') as b from sales_invoices i left join parties p on p.id=i.party_id where (i.number ilike ${like} or p.name ilike ${like}) ${bf('i.branch_id')} order by i.id desc limit 8`),
      run(sql`select i.id, i.number as a, p.name as b from purchase_invoices i join parties p on p.id=i.party_id where (i.number ilike ${like} or p.name ilike ${like}) ${bf('i.branch_id')} order by i.id desc limit 8`),
      run(sql`select id, code as a, name as b from assets where (code ilike ${like} or name ilike ${like} or barcode ilike ${like} or serial ilike ${like}) ${bf('branch_id')} order by name limit 8`),
      run(sql`select id, number as a, title as b from work_orders where (number ilike ${like} or title ilike ${like}) ${bf('branch_id')} order by id desc limit 8`),
      run(sql`select r.id, r.number as a, p.name as b from rentals r join parties p on p.id=r.party_id where (r.number ilike ${like} or p.name ilike ${like}) ${bf('r.branch_id')} order by r.id desc limit 8`),
      run(sql`select qt.id, qt.number as a, coalesce(p.name, qt.customer_name, '') as b from quotes qt left join parties p on p.id=qt.party_id where (qt.number ilike ${like} or p.name ilike ${like} or qt.customer_name ilike ${like}) ${bf('qt.branch_id')} order by qt.id desc limit 8`),
    ]);
    groups = [['📦 الأصناف', '/products', products], ['👤 العملاء والموردون', '/parties', parties], ['🛒 فواتير المبيعات', '/sales', sales], ['📥 فواتير المشتريات', '/purchases', purchases], ['📝 عروض الأسعار', '/quotes', quotes], ['🔧 المعدات', '/assets', assets], ['🛠️ أوامر العمل', '/work-orders', wos], ['🚜 التأجير', '/rentals', rentals]];
  }
  const total = groups.reduce((a, g) => a + g[2].length, 0);
  return (<div><PageHeader title={q ? `نتائج البحث: ${q}` : 'بحث'} />
    {!q && <p className="text-gray-500">اكتب في مربع البحث بالأعلى: اسم صنف أو كوده أو باركوده، عميل، رقم فاتورة، معدة، أمر عمل…</p>}
    {q && !total && <Card><p className="text-gray-500">لا توجد نتائج مطابقة لـ «{q}».</p></Card>}
    <div className="grid gap-4 md:grid-cols-2">{groups.filter((g) => g[2].length).map(([t, base, rows]) => (
      <Card key={t}><h2 className="mb-2 font-semibold">{t}</h2><ul className="divide-y">{rows.map((r) => <li key={r.id}><Link href={`${base}/${r.id}`} className="flex justify-between gap-3 py-2 text-sm hover:text-brand"><span className="font-medium">{r.a}</span><span className="truncate text-gray-500">{r.b}</span></Link></li>)}</ul></Card>))}</div></div>);
}

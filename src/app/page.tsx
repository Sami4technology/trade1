import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Card, PageHeader, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
import { partyBalances, treasuryBalances } from '@/lib/queries';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const b = await currentBranch(); const bf = (col: string) => (b ? sql.raw(`and ${col}=${b}`) : sql``);
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const [k] = (await db.execute(sql`select
    (coalesce((select sum(total) from sales_invoices where status='active' and date>=${month} ${bf('branch_id')}),0) - coalesce((select sum(total) from returns where type='sale' and date>=${month} ${bf('branch_id')}),0))::float as sales_m,
    coalesce((select sum(total) from purchase_invoices where status='active' and date>=${month} ${bf('branch_id')}),0)::float as purch_m,
    coalesce((select sum(amount) from expenses where date>=${month} ${bf('branch_id')}),0)::float as exp_m,
    (select count(*) from service_jobs where status in ('approved','in_progress') ${bf('branch_id')})::int as jobs,
    (select count(*) from work_orders where status in ('open','in_progress') ${bf('branch_id')})::int as wo_open,
    (select count(*) from maintenance_plans mp join assets a on a.id=mp.asset_id where mp.active and mp.next_due<=current_date ${bf('a.branch_id')})::int as plans_due,
    (select count(*) from assets where status in ('stopped','maintenance') ${bf('branch_id')})::int as assets_down,
    (select count(*) from rentals where status='active' ${bf('branch_id')})::int as rent_active,
    (select count(*) from rentals where status='active' and expected_end < current_date ${bf('branch_id')})::int as rent_late`)).rows as Record<string, number>[];
  const [cust, supp, tre] = await Promise.all([partyBalances('customer'), partyBalances('supplier'), treasuryBalances(b)]);
  const rec = cust.reduce((a, x) => a + Math.max(x.balance, 0), 0), pay = supp.reduce((a, x) => a + Math.max(x.balance, 0), 0), cash = tre.reduce((a, x) => a + x.balance, 0);
  const low = (await db.execute(sql`select p.code,p.name,b.name as branch,s.qty::float as qty,p.min_qty::float as min,p.unit from stock s join products p on p.id=s.product_id join branches b on b.id=s.branch_id where p.active and s.qty<=p.min_qty and p.min_qty>0 ${b ? sql.raw(`and s.branch_id=${b}`) : sql``} order by s.qty limit 10`)).rows as Record<string, string | number>[];
  const stats: [string, number, string][] = [['مبيعات الشهر', k.sales_m, 'text-green-700'], ['مشتريات الشهر', k.purch_m, 'text-gray-900'], ['مصروفات الشهر', k.exp_m, 'text-red-700'], ['أرصدة الخزائن', cash, 'text-blue-700'], ['مستحق من العملاء', rec, 'text-amber-700'], ['مستحق للموردين', pay, 'text-red-700'], ['أوامر صيانة مفتوحة', k.wo_open, 'text-blue-700'], ['صيانة وقائية مستحقة', k.plans_due, 'text-red-700'], ['معدات متوقفة/تحت صيانة', k.assets_down, 'text-amber-700']];
  return (<div><PageHeader title="لوحة التحكم" action={{ href: '/sales/new', label: '+ فاتورة بيع' }} />
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{stats.map(([l, v, c]) => <Card key={l}><div className="text-xs text-gray-500">{l}</div><div className={`mt-1 text-xl font-bold ${c}`}>{fmt(v)}</div></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <section><h2 className="mb-2 font-semibold">أصناف تحت حد الطلب</h2><Table head={['الكود', 'الصنف', 'الفرع', 'المتاح', 'الحد الأدنى']}>
        {low.map((x, i) => <tr key={i}><Td>{x.code}</Td><Td>{x.name}</Td><Td>{x.branch}</Td><Td className="font-semibold text-red-700">{fmt(x.qty)} {x.unit}</Td><Td>{fmt(x.min)}</Td></tr>)}
        {!low.length && <tr><Td className="text-gray-400">المخزون كافٍ</Td><Td /><Td /><Td /><Td /></tr>}</Table></section>
      <section><h2 className="mb-2 font-semibold">أكبر الذمم المدينة</h2><Table head={['العميل', 'الرصيد']}>
        {cust.filter((x) => x.balance > 0).sort((a, c) => c.balance - a.balance).slice(0, 8).map((x) => <tr key={x.id}><Td><Link className="text-brand" href={`/parties/${x.id}`}>{x.name}</Link></Td><Td>{fmt(x.balance)}</Td></tr>)}</Table>
        <p className="mt-2 text-sm text-gray-600">أوامر خدمة جارية: <Link href="/jobs" className="font-semibold text-brand">{k.jobs}</Link> · تأجير نشط: <Link href="/rentals" className="font-semibold text-brand">{k.rent_active}</Link>{k.rent_late > 0 && <span className="font-semibold text-red-600"> ({k.rent_late} متأخر)</span>}</p></section>
    </div></div>);
}

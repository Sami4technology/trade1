import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Card, PageHeader, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
import { partyBalances, treasuryBalances, aging } from '@/lib/queries';
import MiniChart, { Spark } from '@/components/MiniChart';
import { getSession } from '@/lib/session';
import * as sc from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TrendingUp, Wallet, PackageX, Wrench, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  const [cnt] = (await db.execute(sql`select
    (select count(*) from cheques where status='pending' and due_date <= current_date + 3 ${bf('branch_id')})::int as chq_due,
    (select count(*) from stock s2 join products p2 on p2.id=s2.product_id where p2.active and p2.min_qty>0 and s2.qty<=p2.min_qty ${bf('s2.branch_id')})::int as low_n`)).rows as Record<string, number>[];
  const late = (await aging('customer')).filter((x) => x.b31 + x.b61 + x.b90 > 0.005);
  const months = (await db.execute(sql`select to_char(m,'YYYY-MM') as ym,
    coalesce((select sum(total) from sales_invoices where status='active' and date_trunc('month',date)=m ${bf('branch_id')}),0)::float as a,
    coalesce((select sum(amount) from expenses where date_trunc('month',date)=m ${bf('branch_id')}),0)::float as b
    from generate_series(date_trunc('month',current_date) - interval '5 months', date_trunc('month',current_date), interval '1 month') m order by m`)).rows as { ym: string; a: number; b: number }[];
  const se = await getSession(); const [me] = se ? await db.select({ name: sc.users.name }).from(sc.users).where(eq(sc.users.id, se.uid)) : [];
  const daily = (await db.execute(sql`select coalesce((select sum(total) from sales_invoices where status='active' and date=d::date ${bf('branch_id')}),0)::float as v from generate_series(current_date - 13, current_date, interval '1 day') d order by d`)).rows.map((r) => Number((r as { v: number }).v));
  const today = daily[daily.length - 1] ?? 0; const hr = new Date(Date.now() + 2 * 3600e3).getUTCHours(); const hello = hr < 12 ? 'صباح الخير' : hr < 18 ? 'مساء الخير' : 'مساء النور';
  const cur = months[months.length - 1]?.a ?? 0, prev = months[months.length - 2]?.a ?? 0; const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const MN = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const chart = months.map((m) => ({ label: MN[Number(m.ym.slice(5)) - 1], a: m.a, b: m.b }));
  const main = [
    { l: 'مبيعات الشهر', v: fmt(k.sales_m), Icon: TrendingUp, tone: 'bg-blue-50 text-blue-700', h: '/sales', spark: daily },
    { l: 'مستحق من العملاء', v: fmt(rec), Icon: Wallet, tone: 'bg-amber-50 text-amber-700', h: '/parties?type=customer' },
    { l: 'أصناف تحت حد الطلب', v: String(cnt.low_n), Icon: PackageX, tone: cnt.low_n ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700', h: '/stock' },
    { l: 'صيانة مستحقة', v: String(k.plans_due + k.wo_open), Icon: Wrench, tone: k.plans_due ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700', h: '/work-orders' },
  ];
  const more: [string, number, string][] = [['مشتريات الشهر', k.purch_m, 'text-gray-900'], ['مصروفات الشهر', k.exp_m, 'text-red-700'], ['أرصدة الخزائن', cash, 'text-blue-700'], ['مستحق للموردين', pay, 'text-red-700'], ['معدات متوقفة/تحت صيانة', k.assets_down, 'text-amber-700'], ['أوامر خدمة جارية', k.jobs, 'text-blue-700'], ['تأجير نشط', k.rent_active, 'text-blue-700']];
  const attn: [string, number, string][] = [['ديون عملاء متأخرة أكثر من 30 يوماً', late.length, '/reports/aging'], ['شيكات مستحقة خلال 3 أيام', cnt.chq_due, '/cheques'], ['أصناف تحت حد الطلب', cnt.low_n, '/stock'], ['صيانة وقائية مستحقة', k.plans_due, '/plans'], ['تأجيرات متأخرة عن الإرجاع', k.rent_late, '/rentals'], ['معدات متوقفة / تحت صيانة', k.assets_down, '/assets']];
  const quick: [string, string][] = [['+ فاتورة بيع', '/sales/new'], ['+ فاتورة شراء', '/purchases/new'], ['+ تأجير', '/rentals/new'], ['⚠️ بلاغ عطل', '/field/new']];
  const act = attn.filter((x) => x[1] > 0);
  return (<div><div className="mb-5"><h1 className="text-2xl font-bold text-gray-900">{hello}{me?.name ? `، ${me.name.split(' ')[0]}` : ''} 👋</h1><p className="mt-1 text-sm text-gray-500">مبيعات اليوم <b className="text-gray-800">{fmt(today)}</b>{delta !== null && <span className={`mr-2 inline-flex items-center gap-0.5 font-semibold ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>{delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(delta)}% عن الشهر الماضي</span>}</p></div>
    <div className="mb-5 flex gap-2 overflow-x-auto whitespace-nowrap pb-1">{quick.map(([l, h]) => <Link key={h} href={h} className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white">{l}</Link>)}</div>
    <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">{main.map(({ l, v, Icon, tone, h, spark }) => <Link key={l} href={h}><Card className="h-full !rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">{l}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} /></span></div><div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{v}</div>{spark && <div className="mt-1"><Spark data={spark} /></div>}</Card></Link>)}</div>
    <div className="mb-5 grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3"><h2 className="mb-2 font-semibold">المبيعات والمصروفات — آخر 6 أشهر</h2><MiniChart data={chart} /></Card>
      <Card className="lg:col-span-2"><h2 className="mb-2 font-semibold">⚠️ يحتاج انتباهك</h2>
        {act.length ? <ul className="divide-y">{act.map(([l, n, h]) => <li key={l}><Link href={h} className="flex items-center justify-between py-2 text-sm hover:text-brand"><span>{l}</span><span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">{n}</span></Link></li>)}</ul> : <p className="py-4 text-center text-sm text-green-700">✅ لا شيء يحتاج انتباهك الآن</p>}</Card></div>
    <details className="mb-5 rounded-xl border bg-white p-3 shadow-sm"><summary className="cursor-pointer text-sm font-semibold text-brand">عرض المزيد من المؤشرات</summary>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{more.map(([l, v, c]) => <div key={l} className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">{l}</div><div className={`mt-1 text-lg font-bold ${c}`}>{fmt(v)}</div></div>)}</div></details>
    <div className="grid gap-6 lg:grid-cols-2">
      <section><h2 className="mb-2 font-semibold">أصناف تحت حد الطلب</h2><Table head={['الكود', 'الصنف', 'الفرع', 'المتاح', 'الحد الأدنى']}>
        {low.map((x, i) => <tr key={i}><Td>{x.code}</Td><Td>{x.name}</Td><Td>{x.branch}</Td><Td className="font-semibold text-red-700">{fmt(x.qty)} {x.unit}</Td><Td>{fmt(x.min)}</Td></tr>)}
        {!low.length && <tr><Td className="text-gray-400">المخزون كافٍ</Td><Td /><Td /><Td /><Td /></tr>}</Table></section>
      <section><h2 className="mb-2 font-semibold">أكبر الذمم المدينة</h2><Table head={['العميل', 'الرصيد']}>
        {cust.filter((x) => x.balance > 0).sort((a, c) => c.balance - a.balance).slice(0, 8).map((x) => <tr key={x.id}><Td><Link className="text-brand" href={`/parties/${x.id}`}>{x.name}</Link></Td><Td>{fmt(x.balance)}</Td></tr>)}</Table></section>
    </div></div>);
}

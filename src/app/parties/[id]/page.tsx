import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Statement({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [p] = await db.select().from(s.parties).where(eq(s.parties.id, id)); if (!p) notFound();
  const cust = p.type === 'customer';
  const inv = (await db.execute(cust
    ? sql`select id, number, date::text as date, total::float as amt, 'inv' as kind, 'sales' as path from sales_invoices where party_id=${id} and status='active'`
    : sql`select id, number, date::text as date, total::float as amt, 'inv' as kind, 'purchases' as path from purchase_invoices where party_id=${id} and status='active'`)).rows as { id: number; number: string; date: string; amt: number; path: string }[];
  const pay = await db.select().from(s.payments).where(eq(s.payments.partyId, id));
  const rets = await db.select().from(s.returns).where(eq(s.returns.partyId, id));
  type E = { date: string; label: string; debit: number; credit: number; href?: string };
  const ev: E[] = [
    ...inv.map((x) => ({ date: x.date, label: `فاتورة ${x.number}`, debit: x.amt, credit: 0, href: `/${x.path}/${x.id}` })),
    ...pay.map((x) => { const isPay = x.direction === (cust ? 'in' : 'out'); return { date: x.date, label: `${isPay ? 'سند' : 'سند عكسي'} ${x.note ?? ''}`, debit: isPay ? 0 : Number(x.amount), credit: isPay ? Number(x.amount) : 0 }; }),
    ...rets.map((x) => ({ date: x.date, label: `مرتجع ${x.number}`, debit: 0, credit: Number(x.total) })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let bal = Number(p.openingBalance);
  return (<div className="max-w-4xl"><PageHeader title={`كشف حساب: ${p.name}`} action={{ href: `/accounts/new?partyId=${id}&direction=${cust ? 'in' : 'out'}&back=/parties/${id}`, label: cust ? '+ سند قبض' : '+ سند صرف' }} />
    <Table head={['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد']}>
      <tr className="bg-gray-50"><Td /><Td>رصيد افتتاحي</Td><Td /><Td /><Td>{fmt(bal)}</Td></tr>
      {ev.map((e, i) => { bal += e.debit - e.credit; return <tr key={i}><Td>{fmtDate(e.date)}</Td><Td>{e.href ? <Link className="text-brand" href={e.href}>{e.label}</Link> : e.label}</Td><Td>{e.debit ? fmt(e.debit) : ''}</Td><Td>{e.credit ? fmt(e.credit) : ''}</Td><Td>{fmt(bal)}</Td></tr>; })}
      <tr className="bg-gray-50 font-semibold"><Td /><Td>الرصيد الحالي ({cust ? 'مستحق على العميل' : 'مستحق للمورد'})</Td><Td /><Td /><Td>{fmt(bal)}</Td></tr></Table></div>);
}

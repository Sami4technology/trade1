import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate, qSt } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Quotes() {
  const b = await currentBranch();
  const rows = await db.select({ q: s.quotes, p: s.parties.name }).from(s.quotes).leftJoin(s.parties, eq(s.parties.id, s.quotes.partyId)).where(b ? and(eq(s.quotes.branchId, b)) : undefined).orderBy(desc(s.quotes.id)).limit(200);
  const today = new Date().toISOString().slice(0, 10);
  return (<div><PageHeader title="عروض الأسعار" action={{ href: '/quotes/new', label: '+ عرض سعر' }} />
    <Table head={['الرقم', 'العميل', 'التاريخ', 'صالح حتى', 'الإجمالي', 'الحالة']}>{rows.map(({ q, p }) => <tr key={q.id}><Td><Link className="font-medium text-brand" href={`/quotes/${q.id}`}>{q.number}</Link></Td><Td>{p ?? q.customerName}</Td><Td>{fmtDate(q.date)}</Td><Td>{fmtDate(q.validUntil)}{q.status === 'open' && q.validUntil && String(q.validUntil) < today && <span className="mr-1 text-xs text-red-600">منتهي</span>}</Td><Td>{fmt(q.total)}</Td><Td><Badge cls={qSt[q.status].cls}>{qSt[q.status].label}</Badge></Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد عروض</Td>{[1, 2, 3, 4, 5].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

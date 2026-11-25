import { eq, desc, sql, or } from 'drizzle-orm';
import { currentBranch } from '@/lib/branch';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema as s } from '@/db';
import { PageHeader, Table, Td } from '@/components/ui';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Transfers() {
  const b = await currentBranch(); const f = alias(s.branches, 'f'), t = alias(s.branches, 't');
  const rows = await db.select({ t: s.transfers, f: f.name, to: t.name, n: sql<number>`(select count(*) from transfer_items where transfer_id=${s.transfers.id})::int` }).from(s.transfers).innerJoin(f, eq(f.id, s.transfers.fromBranchId)).innerJoin(t, eq(t.id, s.transfers.toBranchId)).where(b ? or(eq(s.transfers.fromBranchId, b), eq(s.transfers.toBranchId, b)) : undefined).orderBy(desc(s.transfers.id)).limit(100);
  return (<div><PageHeader title="التحويلات بين الفروع" action={{ href: '/stock/transfers/new', label: '+ تحويل جديد' }} /><Table head={['الرقم', 'التاريخ', 'من', 'إلى', 'عدد الأصناف', 'ملاحظات']}>
    {rows.map((r) => <tr key={r.t.id}><Td>{r.t.number}</Td><Td>{fmtDate(r.t.date)}</Td><Td>{r.f}</Td><Td>{r.to}</Td><Td>{r.n}</Td><Td>{r.t.note ?? '—'}</Td></tr>)}
    {!rows.length && <tr><Td className="text-gray-400">لا توجد تحويلات</Td><Td /><Td /><Td /><Td /><Td /></tr>}</Table></div>);
}

import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { PageHeader, Table, Td, Badge } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
import { treasuryBalances } from '@/lib/queries';
import { currentBranch } from '@/lib/branch';
export const dynamic = 'force-dynamic';
export default async function Accounts() {
  const b = await currentBranch();
  const [tre, pays0] = await Promise.all([treasuryBalances(b), db.select({ p: s.payments, t: s.treasury.name, n: s.parties.name }).from(s.payments).innerJoin(s.treasury, eq(s.treasury.id, s.payments.treasuryId)).leftJoin(s.parties, eq(s.parties.id, s.payments.partyId)).orderBy(desc(s.payments.id)).limit(100)]);
  const ids = new Set(tre.map((t) => t.id)); const pays = pays0.filter(({ p }) => !b || ids.has(p.treasuryId));
  return (<div><PageHeader title="الخزائن والسندات" action={{ href: '/accounts/new', label: '+ سند قبض / صرف' }} />
    <div className="mb-6"><Table head={['الخزينة / الحساب', 'النوع', 'الفرع', 'الرصيد']}>{tre.map((t) => <tr key={t.id}><Td>{t.name}</Td><Td>{t.type === 'bank' ? 'بنك' : 'نقدية'}</Td><Td>{t.branch ?? '—'}</Td><Td className="font-semibold">{fmt(t.balance)}</Td></tr>)}
      {!tre.length && <tr><Td className="text-gray-400">أضف خزينة من الإعدادات</Td><Td /><Td /><Td /></tr>}</Table></div>
    <h2 className="mb-2 font-semibold">آخر السندات</h2><Table head={['التاريخ', 'النوع', 'الطرف', 'الخزينة', 'المبلغ', 'البيان']}>
      {pays.map(({ p, t, n }) => <tr key={p.id}><Td>{fmtDate(p.date)}</Td><Td><Badge cls={p.direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{p.direction === 'in' ? 'قبض' : 'صرف'}</Badge></Td><Td>{n ?? '—'}</Td><Td>{t}</Td><Td>{fmt(p.amount)}</Td><Td>{p.note ?? '—'}</Td></tr>)}</Table></div>);
}

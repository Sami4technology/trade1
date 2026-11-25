import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Returns() {
  const b = await currentBranch();
  const rows = await db.select({ r: s.returns, p: s.parties.name, br: s.branches.name, si: s.salesInvoices.number, pi: s.purchaseInvoices.number }).from(s.returns).leftJoin(s.parties, eq(s.parties.id, s.returns.partyId)).innerJoin(s.branches, eq(s.branches.id, s.returns.branchId)).leftJoin(s.salesInvoices, eq(s.salesInvoices.id, s.returns.salesInvoiceId)).leftJoin(s.purchaseInvoices, eq(s.purchaseInvoices.id, s.returns.purchaseInvoiceId)).where(b ? eq(s.returns.branchId, b) : undefined).orderBy(desc(s.returns.id)).limit(200);
  return (<div><PageHeader title="المرتجعات" /><p className="mb-3 text-sm text-gray-600">يُنشأ المرتجع من صفحة الفاتورة الأصلية (زر «مرتجع»).</p>
    <Table head={['الرقم', 'التاريخ', 'النوع', 'الفاتورة', 'الطرف', 'الفرع', 'القيمة', 'المردود نقداً']}>{rows.map(({ r, p, br, si, pi }) => <tr key={r.id}><Td>{r.number}</Td><Td>{fmtDate(r.date)}</Td><Td><Badge cls={r.type === 'sale' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>{r.type === 'sale' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}</Badge></Td>
      <Td><Link className="text-brand" href={r.type === 'sale' ? `/sales/${r.salesInvoiceId}` : `/purchases/${r.purchaseInvoiceId}`}>{si ?? pi}</Link></Td><Td>{p ?? 'نقدي'}</Td><Td>{br}</Td><Td>{fmt(r.total)}</Td><Td>{fmt(r.refund)}</Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد مرتجعات</Td>{[1, 2, 3, 4, 5, 6, 7].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

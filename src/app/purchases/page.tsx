import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Purchases() {
  const b = await currentBranch();
  const rows = await db.select({ i: s.purchaseInvoices, p: s.parties.name, br: s.branches.name }).from(s.purchaseInvoices).innerJoin(s.parties, eq(s.parties.id, s.purchaseInvoices.partyId)).innerJoin(s.branches, eq(s.branches.id, s.purchaseInvoices.branchId)).where(b ? eq(s.purchaseInvoices.branchId, b) : undefined).orderBy(desc(s.purchaseInvoices.id)).limit(200);
  return (<div><PageHeader title="فواتير المشتريات" action={{ href: '/purchases/new', label: '+ فاتورة شراء' }} /><Table head={['الرقم', 'التاريخ', 'المورد', 'الفرع', 'الإجمالي', 'المدفوع', 'المتبقي', '']}>
    {rows.map(({ i, p, br }) => { const rem = Number(i.total) - Number(i.returned) - Number(i.paid); return (<tr key={i.id} className={i.status === 'cancelled' ? 'opacity-50' : ''}><Td><Link className="font-medium text-brand" href={`/purchases/${i.id}`}>{i.number}</Link></Td><Td>{fmtDate(i.date)}</Td><Td>{p}</Td><Td>{br}</Td><Td>{fmt(i.total)}</Td><Td>{fmt(i.paid)}</Td><Td className={rem > 0 ? 'text-red-700' : ''}>{fmt(rem)}</Td><Td>{i.status === 'cancelled' ? <Badge cls="bg-gray-200 text-gray-700">ملغاة</Badge> : rem <= 0.005 ? <Badge cls="bg-green-100 text-green-800">مدفوعة</Badge> : Number(i.paid) > 0 ? <Badge cls="bg-amber-100 text-amber-800">جزئي</Badge> : <Badge cls="bg-red-100 text-red-800">غير مدفوعة</Badge>}</Td></tr>); })}
    {!rows.length && <tr><Td className="text-gray-400">لا توجد فواتير</Td>{[1, 2, 3, 4, 5, 6, 7].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Stocktakes() {
  const b = await currentBranch();
  const rows = await db.select({ t: s.stocktakes, br: s.branches.name }).from(s.stocktakes).innerJoin(s.branches, eq(s.branches.id, s.stocktakes.branchId)).where(b ? eq(s.stocktakes.branchId, b) : undefined).orderBy(desc(s.stocktakes.id)).limit(100);
  return (<div><PageHeader title="الجرد الفعلي" action={{ href: '/stocktakes/new', label: '+ بدء جرد' }} />
    <Table head={['الرقم', 'الفرع', 'التاريخ', 'الحالة']}>{rows.map(({ t, br }) => <tr key={t.id}><Td><Link className="font-medium text-brand" href={`/stocktakes/${t.id}`}>{t.number}</Link></Td><Td>{br}</Td><Td>{fmtDate(t.date)}</Td><Td><Badge cls={t.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>{t.status === 'posted' ? 'مُعتمد' : 'جارٍ'}</Badge></Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد عمليات جرد</Td><Td /><Td /><Td /></tr>}</Table></div>);
}

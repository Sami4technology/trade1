import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, Btn, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmtDate, priority, woStatus, woType } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function WorkOrders({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const { status, type } = await searchParams; const b = await currentBranch(); const c = [];
  if (b) c.push(eq(s.workOrders.branchId, b)); if (status) c.push(eq(s.workOrders.status, status)); if (type) c.push(eq(s.workOrders.type, type));
  const rows = await db.select({ w: s.workOrders, e: s.assets.name, t: s.technicians.name }).from(s.workOrders).innerJoin(s.assets, eq(s.assets.id, s.workOrders.assetId)).leftJoin(s.technicians, eq(s.technicians.id, s.workOrders.technicianId)).where(c.length ? and(...c) : undefined).orderBy(desc(s.workOrders.id)).limit(200);
  return (<div><PageHeader title="أوامر عمل الصيانة" action={{ href: '/work-orders/new', label: '+ أمر عمل جديد' }} />
    <form className="mb-4 flex gap-2"><div className="w-40"><Select name="status" defaultValue={status ?? ''}><option value="">كل الحالات</option>{Object.entries(woStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div><div className="w-40"><Select name="type" defaultValue={type ?? ''}><option value="">كل الأنواع</option>{Object.entries(woType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div><Btn variant="ghost">تصفية</Btn></form>
    <Table head={['الرقم', 'المعدة', 'العنوان', 'النوع', 'الأولوية', 'الفني', 'التاريخ', 'الحالة']}>{rows.map(({ w, e, t }) => <tr key={w.id}><Td><Link className="font-medium text-brand" href={`/work-orders/${w.id}`}>{w.number}</Link></Td><Td>{e}</Td><Td>{w.title}</Td><Td>{woType[w.type]}</Td><Td><Badge cls={priority[w.priority].cls}>{priority[w.priority].label}</Badge></Td><Td>{t ?? '—'}</Td><Td>{fmtDate(w.reportedAt)}</Td><Td><Badge cls={woStatus[w.status].cls}>{woStatus[w.status].label}</Badge></Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد أوامر</Td>{[1, 2, 3, 4, 5, 6, 7].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

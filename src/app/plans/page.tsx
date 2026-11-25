import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { generatePlanWorkOrder, togglePlan } from '@/lib/actions';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Plans() {
  const b = await currentBranch(); const today = new Date().toISOString().slice(0, 10);
  const rows = await db.select({ p: s.maintenancePlans, e: s.assets }).from(s.maintenancePlans).innerJoin(s.assets, eq(s.assets.id, s.maintenancePlans.assetId)).where(b ? and(eq(s.assets.branchId, b)) : undefined).orderBy(asc(s.maintenancePlans.nextDue));
  return (<div><PageHeader title="الصيانة الوقائية" action={{ href: '/plans/new', label: '+ خطة صيانة' }} /><Table head={['المعدة', 'المهمة', 'الدورية (يوم)', 'آخر تنفيذ', 'الاستحقاق', '']}>
    {rows.map(({ p, e }) => { const late = p.active && String(p.nextDue) <= today; return (<tr key={p.id} className={p.active ? '' : 'opacity-50'}><Td><Link className="text-brand" href={`/assets/${e.id}`}>{e.name}</Link></Td><Td>{p.title}</Td><Td>{p.intervalDays}</Td><Td>{fmtDate(p.lastDone)}</Td><Td>{fmtDate(p.nextDue)} {late && <Badge cls="bg-red-100 text-red-800">مستحقة</Badge>}</Td>
      <Td><div className="flex gap-3">{p.active && <form action={generatePlanWorkOrder}><input type="hidden" name="id" value={p.id} /><button className="text-xs font-medium text-brand">إنشاء أمر عمل</button></form>}<form action={togglePlan}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={p.active ? '0' : '1'} /><button className="text-xs text-gray-600">{p.active ? 'إيقاف' : 'تفعيل'}</button></form></div></Td></tr>); })}
    {!rows.length && <tr><Td className="text-gray-400">لا توجد خطط</Td>{[1, 2, 3, 4, 5].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

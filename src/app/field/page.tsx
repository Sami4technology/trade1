import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { startWorkOrder } from '@/lib/actions';
import { Badge } from '@/components/ui';
import { priority, woStatus } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Field() {
  const b = await currentBranch(); const c = [inArray(s.workOrders.status, ['open', 'in_progress'])]; if (b) c.push(eq(s.workOrders.branchId, b));
  const rows = await db.select({ w: s.workOrders, a: s.assets.name, code: s.assets.code }).from(s.workOrders).innerJoin(s.assets, eq(s.assets.id, s.workOrders.assetId)).where(and(...c)).orderBy(desc(s.workOrders.id)).limit(40);
  return (<div className="mx-auto max-w-md"><h1 className="mb-3 text-xl font-bold">واجهة الفنيين</h1>
    <Link href="/field/new" className="mb-4 block rounded-xl bg-red-600 py-4 text-center text-lg font-bold text-white">⚠️ بلاغ عطل جديد</Link>
    <div className="space-y-3">{rows.map(({ w, a, code }) => <div key={w.id} className="rounded-xl border bg-white p-4"><div className="mb-1 flex items-center justify-between"><b>{code} — {a}</b><Badge cls={woStatus[w.status].cls}>{woStatus[w.status].label}</Badge></div>
      <div className="mb-2 text-sm text-gray-700">{w.title}</div><div className="mb-3 flex items-center gap-2 text-xs text-gray-500"><Badge cls={priority[w.priority].cls}>{priority[w.priority].label}</Badge>{w.number}</div>
      <div className="flex gap-2">{w.status === 'open' && <form action={startWorkOrder} className="flex-1"><input type="hidden" name="id" value={w.id} /><button className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white">بدء العمل</button></form>}<Link href={`/work-orders/${w.id}`} className="flex-1 rounded-lg border border-brand py-3 text-center font-semibold text-brand">{w.status === 'open' ? 'تفاصيل' : 'تفاصيل وإنهاء'}</Link></div></div>)}
      {!rows.length && <p className="rounded-xl border bg-white p-6 text-center text-gray-400">لا توجد أوامر عمل مفتوحة 👌</p>}</div></div>);
}

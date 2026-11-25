import { and, eq, ne } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { createWorkOrder } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { priority, woType } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function NewWO({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const { assetId } = await searchParams; const b = await currentBranch();
  const [eqs, techs] = await Promise.all([db.select().from(s.assets).where(b ? and(ne(s.assets.status, 'retired'), eq(s.assets.branchId, b)) : ne(s.assets.status, 'retired')).orderBy(s.assets.code), db.select().from(s.technicians).where(eq(s.technicians.active, true))]);
  return (<div className="max-w-2xl"><PageHeader title="أمر عمل / بلاغ عطل" /><Card><form action={createWorkOrder} className="space-y-4">
    <Field label="المعدة *"><Select name="assetId" required defaultValue={assetId ?? ''}><option value="" disabled>اختر المعدة</option>{eqs.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}</Select></Field>
    <div className="grid grid-cols-2 gap-4"><Field label="النوع"><Select name="type" defaultValue="corrective">{Object.entries(woType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field><Field label="الأولوية"><Select name="priority" defaultValue="medium">{Object.entries(priority).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field></div>
    <Field label="العنوان *"><Input name="title" required /></Field><Field label="الوصف"><Textarea name="description" /></Field>
    <Field label="الفني"><Select name="technicianId"><option value="">— غير معيّن —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
    <p className="text-xs text-gray-500">الأمر الطارئ يوقف المعدة تلقائياً. قطع الغيار تُصرف من مخزن فرع المعدة.</p><Btn>إنشاء</Btn></form></Card></div>);
}

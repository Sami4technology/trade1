import { and, eq, ne } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { createPlan } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewPlan() {
  const b = await currentBranch(); const eqs = await db.select().from(s.assets).where(b ? and(ne(s.assets.status, 'retired'), eq(s.assets.branchId, b)) : ne(s.assets.status, 'retired')).orderBy(s.assets.code);
  return (<div className="max-w-xl"><PageHeader title="خطة صيانة وقائية" /><Card><form action={createPlan} className="space-y-4">
    <Field label="المعدة *"><Select name="assetId" required defaultValue=""><option value="" disabled>اختر</option>{eqs.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name}</option>)}</Select></Field>
    <Field label="المهمة *"><Input name="title" required placeholder="تغيير زيت وفلاتر" /></Field><Field label="تتكرر كل (يوم) *"><Input name="intervalDays" type="number" min="1" defaultValue="30" required /></Field>
    <Field label="أول استحقاق (فارغ = بعد مدة الدورية)"><Input name="nextDue" type="date" /></Field><Btn>حفظ</Btn></form></Card></div>);
}

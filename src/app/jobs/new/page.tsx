import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { allBranches, currentBranch } from '@/lib/branch';
import { createJob } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { jobKinds } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function NewJob() {
  const [branches, cust, cb] = await Promise.all([allBranches(), db.select().from(s.parties).where(eq(s.parties.type, 'customer')), currentBranch()]);
  return (<div className="max-w-2xl"><PageHeader title="أمر خدمة / عرض سعر" /><Card><form action={createJob} className="grid gap-4 md:grid-cols-2">
    <Field label="العميل *"><Select name="partyId" required defaultValue=""><option value="" disabled>اختر</option>{cust.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
    <Field label="الفرع المنفِّذ (مخزن الخامات)"><Select name="branchId" defaultValue={cb ?? branches[0]?.id}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
    <Field label="نوع العمل"><Select name="kind">{Object.entries(jobKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
    <Field label="تاريخ البدء"><Input name="startDate" type="date" /></Field>
    <div className="md:col-span-2"><Field label="عنوان العمل *"><Input name="title" required placeholder="مثال: صيانة سقف هنقر مصنع…" /></Field></div>
    <div className="md:col-span-2"><Field label="موقع التنفيذ"><Input name="siteAddress" /></Field></div>
    <Field label="قيمة العرض / العقد"><Input name="quoteAmount" type="number" step="0.01" defaultValue="0" /></Field>
    <div className="md:col-span-2"><Field label="ملاحظات / نطاق العمل"><Textarea name="notes" /></Field></div><div className="md:col-span-2"><Btn>حفظ</Btn></div></form></Card></div>);
}

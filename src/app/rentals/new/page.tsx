import { and, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch, visibleTreasuries } from '@/lib/branch';
import { createRental } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewRental({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const { assetId } = await searchParams; const cb = await currentBranch();
  const [assets, customers, tre] = await Promise.all([db.select().from(s.assets).where(cb ? and(eq(s.assets.status, 'running'), eq(s.assets.branchId, cb)) : eq(s.assets.status, 'running')).orderBy(s.assets.code), db.select().from(s.parties).where(eq(s.parties.type, 'customer')), visibleTreasuries()]);
  return (<div className="max-w-3xl"><PageHeader title="عقد تأجير معدة" /><Card><form action={createRental} className="grid gap-4 md:grid-cols-2">
    <Field label="المعدة (المتاحة فقط) *"><Select name="assetId" required defaultValue={assetId}>{assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}{Number(a.dailyRate) ? ` (${Number(a.dailyRate)}/يوم)` : ''}</option>)}</Select></Field>
    <Field label="العميل *"><Select name="partyId" required>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
    <Field label="تاريخ البدء"><Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="الإرجاع المتوقع"><Input name="expectedEnd" type="date" /></Field>
    <Field label="سعر التأجير اليومي *"><Input name="dailyRate" type="number" step="0.01" min="0" required /></Field><Field label="موقع الاستخدام"><Input name="siteNote" /></Field>
    <Field label="عربون مقبوض"><Input name="deposit" type="number" step="0.01" min="0" defaultValue="0" /></Field><Field label="الخزينة (للعربون)"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
    <div className="md:col-span-2"><Field label="ملاحظات"><Textarea name="note" /></Field></div><div className="md:col-span-2"><Btn>حفظ العقد</Btn></div></form>
    {!customers.length && <p className="mt-3 text-sm text-red-600">أضف عميلاً أولاً من صفحة العملاء.</p>}</Card></div>);
}

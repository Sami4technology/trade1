import { db, schema as s } from '@/db';
import { allBranches, currentBranch } from '@/lib/branch';
import { createCheque } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewCheque() {
  const [br, cb, parties] = await Promise.all([allBranches(), currentBranch(), db.select().from(s.parties).orderBy(s.parties.name)]);
  return (<div className="max-w-2xl"><PageHeader title="تسجيل شيك" /><Card><form action={createCheque} className="grid gap-4 md:grid-cols-2">
    <Field label="النوع"><Select name="direction"><option value="in">مستلم من عميل</option><option value="out">صادر لمورد</option></Select></Field><Field label="الطرف *"><Select name="partyId" required>{parties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type === 'customer' ? 'عميل' : 'مورد'})</option>)}</Select></Field>
    <Field label="رقم الشيك *"><Input name="number" required /></Field><Field label="البنك"><Input name="bank" /></Field><Field label="المبلغ *"><Input name="amount" type="number" step="0.01" min="0.01" required /></Field><Field label="تاريخ الاستحقاق *"><Input name="dueDate" type="date" required /></Field>
    <Field label="رقم الفاتورة المرتبطة (اختياري)"><Input name="invoiceNo" placeholder="S-2026-0001" /></Field><Field label="الفرع"><Select name="branchId" defaultValue={cb ?? br[0]?.id}>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
    <div className="md:col-span-2"><Field label="ملاحظات"><Input name="note" /></Field></div><div className="md:col-span-2"><Btn>حفظ</Btn></div></form></Card></div>);
}

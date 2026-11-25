import { allBranches, currentBranch } from '@/lib/branch';
import { createAsset } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { criticality } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function NewAsset() {
  const [br, cb] = await Promise.all([allBranches(), currentBranch()]);
  return (<div className="max-w-3xl"><PageHeader title="معدة جديدة" /><Card><form action={createAsset} className="grid gap-4 md:grid-cols-2">
    <Field label="الكود *"><Input name="code" required placeholder="EQ-001" /></Field><Field label="الاسم *"><Input name="name" required /></Field>
    <Field label="الفرع / القسم"><Select name="branchId" defaultValue={cb ?? br[0]?.id}>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field><Field label="الفئة"><Input name="category" placeholder="مخرطة / ضاغط / مولد…" /></Field>
    <Field label="الشركة المصنعة"><Input name="manufacturer" /></Field><Field label="الموديل"><Input name="model" /></Field><Field label="الرقم التسلسلي"><Input name="serial" /></Field>
    <Field label="الأهمية"><Select name="criticality" defaultValue="medium">{Object.entries(criticality).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
    <Field label="تاريخ الشراء"><Input name="purchaseDate" type="date" /></Field><Field label="تكلفة الشراء"><Input name="purchaseCost" type="number" step="0.01" /></Field><Field label="العمر الإنتاجي (سنوات) للإهلاك"><Input name="lifeYears" type="number" min="1" /></Field><Field label="قيمة الخردة"><Input name="salvageValue" type="number" step="0.01" min="0" defaultValue="0" /></Field><Field label="باركود المعدة"><Input name="barcode" /></Field><Field label="سعر التأجير اليومي (اختياري)"><Input name="dailyRate" type="number" step="0.01" min="0" /></Field>
    <div className="md:col-span-2"><Field label="ملاحظات"><Textarea name="notes" /></Field></div><div className="md:col-span-2"><Btn>حفظ</Btn></div></form></Card></div>);
}

import { db, schema as s } from '@/db';
import { createProduct } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { kinds } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function NewProduct() {
  const cats = await db.select().from(s.categories);
  return (<div className="max-w-2xl"><PageHeader title="صنف جديد" /><Card><form action={createProduct} className="grid gap-4 md:grid-cols-2">
    <Field label="الكود *"><Input name="code" required /></Field><Field label="الاسم *"><Input name="name" required /></Field>
    <Field label="الفئة"><Select name="categoryId"><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{kinds[c.kind]} · {c.name}</option>)}</Select></Field>
    <Field label="الوحدة (قطعة / كجم / طن / متر)"><Input name="unit" defaultValue="قطعة" /></Field>
    <Field label="سعر البيع (بالعملة المحلية)"><Input name="salePrice" type="number" step="0.01" defaultValue="0" /></Field><Field label="سعر البيع بالدولار (اختياري — يُحسب منه السعر المحلي)"><Input name="usdPrice" type="number" step="0.01" defaultValue="0" /></Field><Field label="التكلفة الافتتاحية"><Input name="avgCost" type="number" step="0.01" defaultValue="0" /></Field>
    <Field label="الباركود (اختياري — يُمسح بجهاز القارئ)"><Input name="barcode" /></Field><Field label="حد إعادة الطلب"><Input name="minQty" type="number" step="0.001" defaultValue="0" /></Field>
    <div className="md:col-span-2"><Btn>حفظ</Btn></div></form></Card>
    {!cats.length && <p className="mt-3 text-sm text-amber-700">أضف الفئات أولاً من الإعدادات. الرصيد الافتتاحي يُدخل عبر «أرصدة المخزون ← تعديل».</p>}</div>);
}

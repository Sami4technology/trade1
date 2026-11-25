import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { editProduct } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { fmt, kinds } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id)); if (!p) notFound();
  const [cats, [rate]] = await Promise.all([db.select().from(s.categories), db.select().from(s.settings).where(eq(s.settings.key, 'usd_rate'))]);
  return (<div className="max-w-2xl"><PageHeader title={`تعديل: ${p.code}`} /><Card><form action={editProduct} className="grid gap-4 md:grid-cols-2"><input type="hidden" name="id" value={id} />
    <Field label="الاسم"><Input name="name" defaultValue={p.name} required /></Field><Field label="الوحدة"><Input name="unit" defaultValue={p.unit} /></Field>
    <Field label="الفئة"><Select name="categoryId" defaultValue={p.categoryId ?? ''}><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{kinds[c.kind]} · {c.name}</option>)}</Select></Field><Field label="الباركود"><Input name="barcode" defaultValue={p.barcode ?? ''} /></Field><Field label="حد إعادة الطلب"><Input name="minQty" type="number" step="0.001" defaultValue={p.minQty} /></Field>
    <Field label="سعر البيع المحلي"><Input name="salePrice" type="number" step="0.01" defaultValue={p.salePrice} /></Field><Field label="سعر البيع بالدولار (يغلب المحلي إن وُجد سعر صرف)"><Input name="usdPrice" type="number" step="0.01" defaultValue={p.usdPrice} /></Field>
    <Field label="الحالة"><Select name="active" defaultValue={p.active ? '1' : '0'}><option value="1">فعّال</option><option value="0">موقوف</option></Select></Field>
    <div className="flex items-end text-xs text-gray-500">متوسط التكلفة الحالي: {fmt(p.avgCost)} · سعر الصرف: {rate ? fmt(rate.value) : 'غير محدد'}</div><div className="md:col-span-2"><Btn>حفظ</Btn></div></form></Card></div>);
}

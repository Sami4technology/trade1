import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { allBranches, currentBranch, visibleTreasuries } from '@/lib/branch';
import { createPurchase } from '@/lib/actions';
import LineItems from '@/components/LineItems';
import { usdRate } from '@/lib/queries';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewPurchase() {
  const rate = await usdRate();
  const [branches, products, sup, tre, cb] = await Promise.all([allBranches(), db.select().from(s.products).orderBy(s.products.code), db.select().from(s.parties).where(eq(s.parties.type, 'supplier')), visibleTreasuries(), currentBranch()]);
  return (<div className="max-w-4xl"><PageHeader title="فاتورة شراء" /><Card><form action={createPurchase} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-4"><Field label="الفرع (يُستلم فيه)"><Select name="branchId" defaultValue={cb ?? branches[0]?.id}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="المورد *"><Select name="partyId" required defaultValue=""><option value="" disabled>اختر</option>{sup.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="رقم فاتورة المورد"><Input name="supplierRef" /></Field></div>
    <LineItems mode="purchase" products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, price: Number(p.salePrice), cost: Number(p.avgCost), usd: Number(p.usdPrice), barcode: p.barcode }))} rate={rate} />
    <div className="rounded-lg border border-dashed border-gray-300 p-3"><div className="mb-2 text-sm font-medium">مصاريف الاستيراد (اختياري) — تُضاف لتكلفة الأصناف بنسبة قيمتها</div>
      <div className="grid gap-2 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="flex gap-2"><Input name={`extra_label_${i}`} placeholder={['شحن', 'جمارك', 'رسوم ميناء / أرضيات', 'تخليص ونقل'][i - 1]} /><div className="w-32"><Input name={`extra_amount_${i}`} type="number" step="0.01" min="0" placeholder="المبلغ" /></div></div>)}</div>
      <div className="mt-2 w-64"><Field label="تُدفع من خزينة"><Select name="extraTreasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field></div></div>
    <div className="grid gap-4 border-t pt-4 md:grid-cols-3"><Field label="المبلغ المدفوع الآن"><Input name="paid" type="number" step="0.01" min="0" defaultValue="0" /></Field>
      <Field label="الخزينة / الحساب"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><Field label="ملاحظات"><Input name="note" /></Field></div>
    <Btn>حفظ واستلام في المخزن</Btn></form></Card>{!sup.length && <p className="mt-3 text-sm text-amber-700">أضف مورداً أولاً.</p>}</div>);
}

import { db, schema as s } from '@/db';
import { allBranches, currentBranch, visibleTreasuries } from '@/lib/branch';
import { createSale } from '@/lib/actions';
import LineItems from '@/components/LineItems';
import { usdRate } from '@/lib/queries';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewSale() {
  const rate = await usdRate();
  const [branches, products, customers, tre, cb] = await Promise.all([allBranches(), db.select().from(s.products).orderBy(s.products.code), db.select().from(s.parties).where((await import('drizzle-orm')).eq(s.parties.type, 'customer')), visibleTreasuries(), currentBranch()]);
  return (<div className="max-w-4xl"><PageHeader title="فاتورة بيع" /><Card><form action={createSale} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-4"><Field label="الفرع (المخزن)"><Select name="branchId" defaultValue={cb ?? branches[0]?.id}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="العميل (فارغ = نقدي)"><Select name="partyId"><option value="">عميل نقدي</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="خصم"><Input name="discount" type="number" step="0.01" min="0" defaultValue="0" /></Field></div>
    <LineItems mode="sale" products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, price: Number(p.salePrice), cost: Number(p.avgCost), usd: Number(p.usdPrice), barcode: p.barcode }))} rate={rate} />
    <div className="grid gap-4 border-t pt-4 md:grid-cols-3"><Field label="المبلغ المدفوع الآن (0 = آجل كامل)"><Input name="paid" type="number" step="0.01" min="0" defaultValue="0" /></Field>
      <Field label="الخزينة / الحساب"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><Field label="ملاحظات"><Input name="note" /></Field></div>
    <Btn>حفظ الفاتورة</Btn></form></Card></div>);
}

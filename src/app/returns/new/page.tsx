import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { canAccess, visibleTreasuries } from '@/lib/branch';
import { createReturn } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function NewReturn({ searchParams }: { searchParams: Promise<{ type?: string; invoiceId?: string }> }) {
  const q = await searchParams; const sale = q.type !== 'purchase'; const id = parseInt(q.invoiceId ?? '', 10); if (isNaN(id)) notFound();
  const inv = sale ? (await db.select().from(s.salesInvoices).where(eq(s.salesInvoices.id, id)))[0] : (await db.select().from(s.purchaseInvoices).where(eq(s.purchaseInvoices.id, id)))[0];
  if (!inv || inv.status !== 'active' || !(await canAccess(inv.branchId))) notFound();
  const items = sale ? await db.select({ id: s.saleItems.id, productId: s.saleItems.productId, name: s.saleItems.description, qty: s.saleItems.qty, price: s.saleItems.unitPrice }).from(s.saleItems).where(eq(s.saleItems.invoiceId, id))
    : await db.select({ id: s.purchaseItems.id, productId: s.purchaseItems.productId, name: s.products.name, qty: s.purchaseItems.qty, price: s.purchaseItems.unitCost }).from(s.purchaseItems).innerJoin(s.products, eq(s.products.id, s.purchaseItems.productId)).where(eq(s.purchaseItems.invoiceId, id));
  const prev = (await db.execute(sql`select ri.product_id, sum(ri.qty)::float as q from return_items ri join returns r on r.id=ri.return_id where ${sale ? sql`r.sales_invoice_id=${id}` : sql`r.purchase_invoice_id=${id}`} group by 1`)).rows as { product_id: number; q: number }[];
  const done = new Map(prev.map((x) => [Number(x.product_id), Number(x.q)])); const tre = await visibleTreasuries();
  return (<div className="max-w-3xl"><PageHeader title={`${sale ? 'مرتجع مبيعات' : 'مرتجع مشتريات'} — فاتورة ${inv.number}`} />
    <Card><form action={createReturn} className="space-y-4"><input type="hidden" name="type" value={sale ? 'sale' : 'purchase'} /><input type="hidden" name="invoiceId" value={id} />
      <Table head={['الصنف', 'الكمية بالفاتورة', 'سبق إرجاعه', 'سعر الوحدة', 'كمية المرتجع']}>{items.filter((x) => x.productId).map((x) => <tr key={x.id}><Td>{x.name}</Td><Td>{fmt(x.qty)}</Td><Td>{fmt(done.get(x.productId!) ?? 0)}</Td><Td>{fmt(x.price)}</Td><Td><div className="w-28"><Input name={`qty_${x.id}`} type="number" step="0.001" min="0" defaultValue="0" /></div></Td></tr>)}</Table>
      <p className="text-xs text-gray-500">{sale ? 'يعود الصنف لمخزن الفرع ويُخفَّض حساب العميل (مع توزيع الخصم إن وُجد).' : 'يخرج الصنف من مخزن الفرع ويُخفَّض حساب المورد.'} سعر المرتجع هو سعر الفاتورة الأصلية.</p>
      <div className="grid gap-4 border-t pt-4 md:grid-cols-4"><Field label={sale ? 'مبلغ يُرد للعميل نقداً' : 'مبلغ يُستلم من المورد'}><Input name="refund" type="number" step="0.01" min="0" defaultValue="0" /></Field>
        <Field label="الخزينة / الحساب"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="ملاحظة"><Input name="note" /></Field></div>
      <p className="text-xs text-gray-500">يُسمح بالرد النقدي فقط بقدر ما دُفع زيادة عن قيمة الفاتورة بعد المرتجع؛ والباقي يُخصم من رصيد الطرف.</p><Btn>تسجيل المرتجع</Btn></form></Card></div>);
}

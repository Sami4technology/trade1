import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { allBranches, currentBranch } from '@/lib/branch';
import { createQuote } from '@/lib/actions';
import QuoteLines from '@/components/QuoteLines';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewQuote() {
  const [br, cb, products, customers] = await Promise.all([allBranches(), currentBranch(), db.select().from(s.products).where(eq(s.products.active, true)).orderBy(s.products.code), db.select().from(s.parties).where(eq(s.parties.type, 'customer'))]);
  const d = new Date(); const v = new Date(d.getTime() + 15 * 864e5).toISOString().slice(0, 10);
  return (<div className="max-w-4xl"><PageHeader title="عرض سعر جديد" /><Card><form action={createQuote} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3"><Field label="الفرع"><Select name="branchId" defaultValue={cb ?? br[0]?.id}>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="العميل المسجل"><Select name="partyId"><option value="">— غير مسجل —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field><Field label="أو اسم العميل (إن لم يكن مسجلاً)"><Input name="customerName" /></Field>
      <Field label="التاريخ"><Input name="date" type="date" defaultValue={d.toISOString().slice(0, 10)} /></Field><Field label="صالح حتى"><Input name="validUntil" type="date" defaultValue={v} /></Field><Field label="خصم"><Input name="discount" type="number" step="0.01" min="0" defaultValue="0" /></Field></div>
    <QuoteLines products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, price: Number(p.salePrice) }))} />
    <Field label="شروط / ملاحظات"><Textarea name="note" /></Field><Btn>حفظ العرض</Btn></form></Card></div>);
}

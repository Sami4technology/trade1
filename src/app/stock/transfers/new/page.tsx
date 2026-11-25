import { db, schema as s } from '@/db';
import { allBranches } from '@/lib/branch';
import { createTransfer } from '@/lib/actions';
import LineItems from '@/components/LineItems';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewTransfer() {
  const [branches, products, everyBranch] = await Promise.all([allBranches(), db.select().from(s.products).orderBy(s.products.code), db.select().from(s.branches).orderBy(s.branches.id)]);
  return (<div className="max-w-3xl"><PageHeader title="تحويل مخزني بين الفروع" /><Card><form action={createTransfer} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3"><Field label="من فرع"><Select name="fromBranchId" defaultValue={branches[0]?.id}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="إلى فرع"><Select name="toBranchId" defaultValue={everyBranch.find((x) => x.id !== branches[0]?.id)?.id}>{everyBranch.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field><Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field></div>
    <LineItems mode="transfer" products={products.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, price: 0, cost: 0, barcode: p.barcode }))} />
    <Field label="ملاحظات"><Input name="note" /></Field><Btn>تنفيذ التحويل</Btn></form></Card></div>);
}

import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { allBranches, currentBranch, visibleTreasuries } from '@/lib/branch';
import { createExpense } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { expenseCats, fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Expenses() {
  const b = await currentBranch();
  const [branches, tre, rows] = await Promise.all([allBranches(), visibleTreasuries(), db.select({ e: s.expenses, b: s.branches.name, t: s.treasury.name }).from(s.expenses).innerJoin(s.branches, eq(s.branches.id, s.expenses.branchId)).innerJoin(s.treasury, eq(s.treasury.id, s.expenses.treasuryId)).where(b ? eq(s.expenses.branchId, b) : undefined).orderBy(desc(s.expenses.id)).limit(100)]);
  return (<div><PageHeader title="المصروفات" />
    <Card className="mb-5"><form action={createExpense} className="grid items-end gap-3 md:grid-cols-6">
      <Field label="الفرع"><Select name="branchId" defaultValue={b ?? branches[0]?.id}>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <Field label="البند"><Select name="category">{expenseCats.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="الخزينة"><Select name="treasuryId" required defaultValue=""><option value="" disabled>اختر</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      <Field label="المبلغ"><Input name="amount" type="number" step="0.01" min="0.01" required /></Field><Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field><Field label="ملاحظة"><Input name="note" /></Field>
      <div className="md:col-span-6"><Btn>تسجيل مصروف</Btn></div></form></Card>
    <Table head={['التاريخ', 'الفرع', 'البند', 'الخزينة', 'المبلغ', 'ملاحظة']}>{rows.map(({ e, b: bn, t }) => <tr key={e.id}><Td>{fmtDate(e.date)}</Td><Td>{bn}</Td><Td>{e.category}</Td><Td>{t}</Td><Td>{fmt(e.amount)}</Td><Td>{e.note ?? '—'}</Td></tr>)}</Table></div>);
}

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { allBranches } from '@/lib/branch';
import { adjustStock } from '@/lib/actions';
import { Btn, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function StockPage() {
  const branches = await allBranches();
  const rows = (await db.execute(sql`select p.id, p.code, p.name, p.unit, p.avg_cost::float as cost, p.min_qty::float as min,
    ${sql.join(branches.map((b) => sql`coalesce((select qty from stock where product_id=p.id and branch_id=${b.id}),0)::float as ${sql.raw('b' + b.id)}`), sql`, `)}
    from products p where p.active order by p.code`)).rows as Record<string, number | string>[];
  let value = 0; rows.forEach((r) => branches.forEach((b) => (value += Number(r['b' + b.id]) * Number(r.cost))));
  return (<div><PageHeader title="أرصدة المخزون" action={{ href: '/stock/transfers/new', label: '⇄ تحويل بين الفروع' }} />
    <p className="mb-3 text-sm text-gray-600">قيمة المخزون الإجمالية (بمتوسط التكلفة): <b>{fmt(value)}</b></p>
    <Table head={['الكود', 'الصنف', ...branches.map((b) => b.name), 'الإجمالي']}>
      {rows.map((r) => { const tot = branches.reduce((a, b) => a + Number(r['b' + b.id]), 0); return (<tr key={r.id}><Td>{r.code}</Td><Td>{r.name}</Td>
        {branches.map((b) => <Td key={b.id} className={Number(r.min) > 0 && Number(r['b' + b.id]) <= Number(r.min) ? 'font-semibold text-red-700' : ''}>{fmt(r['b' + b.id])} {r.unit}</Td>)}<Td className="font-semibold">{fmt(tot)}</Td></tr>); })}
    </Table>
    <h2 className="mb-2 mt-8 font-semibold">تسوية / رصيد افتتاحي</h2>
    <form action={adjustStock} className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <div className="w-64"><Select name="productId" required defaultValue=""><option value="" disabled>الصنف</option>{rows.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}</Select></div>
      <div className="w-40"><Select name="branchId" required>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
      <div className="w-32"><Input name="delta" type="number" step="0.001" placeholder="+50 / -3" required /></div><div className="w-48"><Input name="note" placeholder="السبب (جرد، رصيد افتتاحي…)" /></div><Btn>تطبيق</Btn></form></div>);
}

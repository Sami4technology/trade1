import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { PageHeader, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
export const dynamic = 'force-dynamic';
type R = { id: number; code: string; name: string; cost: number; salv: number; life: number | null; daily: number; age: number; rev: number; rdays: number; maint: number };
export default async function AssetsReport() {
  const rows = (await db.execute(sql`select a.id, a.code, a.name, a.purchase_cost::float as cost, a.salvage_value::float as salv, a.life_years as life,
    (case when a.life_years>0 and a.purchase_date is not null then (a.purchase_cost-a.salvage_value)/(a.life_years*365.0) else 0 end)::float as daily,
    (case when a.purchase_date is not null and a.life_years>0 then least(a.life_years*365, greatest(0,current_date-a.purchase_date)) else 0 end)::int as age,
    coalesce((select sum(amount) from rentals where asset_id=a.id and status='returned'),0)::float as rev, coalesce((select sum(days) from rentals where asset_id=a.id and status='returned'),0)::int as rdays,
    (coalesce((select sum(p.qty*p.unit_cost) from work_order_parts p join work_orders w on w.id=p.work_order_id where w.asset_id=a.id and w.status='done'),0)+coalesce((select sum(labor_cost) from work_orders where asset_id=a.id and status='done'),0))::float as maint
    from assets a order by a.code`)).rows as R[];
  const calc = rows.map((x) => { const acc = x.daily * x.age; return { ...x, acc, book: Math.max(x.cost - acc, x.salv), net: x.rev - x.daily * x.rdays - x.maint }; });
  const tot = (k: 'cost' | 'acc' | 'book' | 'rev' | 'maint' | 'net') => calc.reduce((a, x) => a + x[k], 0);
  return (<div><PageHeader title="الأصول والإهلاك وعائد التأجير" />
    <Table head={['المعدة', 'التكلفة', 'مجمع الإهلاك', 'القيمة الدفترية', 'إيراد التأجير', 'صيانة', 'صافي العائد']}>{calc.map((x) => <tr key={x.id}><Td><Link className="text-brand" href={`/assets/${x.id}`}>{x.code}</Link> — {x.name}{!x.life && <span className="mr-1 text-xs text-amber-700">(بلا عمر إنتاجي)</span>}</Td><Td>{fmt(x.cost)}</Td><Td>{fmt(x.acc)}</Td><Td>{fmt(x.book)}</Td><Td>{fmt(x.rev)}</Td><Td>{fmt(x.maint)}</Td><Td className={x.net < 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>{fmt(x.net)}</Td></tr>)}
      {calc.length > 0 && <tr className="border-t-2 bg-gray-50 font-bold"><Td>الإجمالي</Td><Td>{fmt(tot('cost'))}</Td><Td>{fmt(tot('acc'))}</Td><Td>{fmt(tot('book'))}</Td><Td>{fmt(tot('rev'))}</Td><Td>{fmt(tot('maint'))}</Td><Td>{fmt(tot('net'))}</Td></tr>}</Table>
    <p className="mt-3 text-xs text-gray-500">صافي العائد = إيراد التأجير − (إهلاك أيام التأجير) − تكلفة الصيانة المنجزة. الإهلاك بالقسط الثابت اليومي.</p></div>);
}

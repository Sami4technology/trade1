import { sql } from 'drizzle-orm';
import { db } from '@/db';
export async function partyBalances(type?: string) {
  const r = await db.execute(sql`
    select p.id, p.name, p.type, p.phone, p.opening_balance::float as opening,
      ((case when p.type='customer' then coalesce((select sum(total) from sales_invoices where party_id=p.id and status='active'),0)
            else coalesce((select sum(total) from purchase_invoices where party_id=p.id and status='active'),0) end)
        - coalesce((select sum(total) from returns where party_id=p.id and type=(case when p.type='customer' then 'sale' else 'purchase' end)),0))::float as invoiced,
      coalesce((select sum(amount) from payments where party_id=p.id and direction=(case when p.type='customer' then 'in' else 'out' end)),0)::float as paid,
      coalesce((select sum(amount) from payments where party_id=p.id and direction=(case when p.type='customer' then 'out' else 'in' end)),0)::float as refunded
    from parties p ${type ? sql`where p.type=${type}` : sql``} order by p.name`);
  return (r.rows as { id: number; name: string; type: string; phone: string | null; opening: number; invoiced: number; paid: number; refunded: number }[])
    .map((x) => ({ ...x, balance: x.opening + x.invoiced - x.paid + x.refunded }));
}
export async function treasuryBalances(branchId?: number | null) {
  const r = await db.execute(sql`
    select t.id, t.name, t.type, b.name as branch,
      (t.opening_balance + coalesce((select sum(amount) from payments where treasury_id=t.id and direction='in'),0)
        - coalesce((select sum(amount) from payments where treasury_id=t.id and direction='out'),0)
        - coalesce((select sum(amount) from expenses where treasury_id=t.id),0))::float as balance
    from treasury t left join branches b on b.id=t.branch_id ${branchId ? sql`where t.branch_id=${branchId} or t.branch_id is null` : sql``} order by t.id`);
  return r.rows as { id: number; name: string; type: string; branch: string | null; balance: number }[];
}
export async function usdRate() { const r = await db.execute(sql`select value from settings where key='usd_rate'`); return Number((r.rows[0] as { value: string } | undefined)?.value ?? 0); }
export type AgingRow = { id: number; name: string; phone: string | null; balance: number; b0: number; b31: number; b61: number; b90: number; oldest: number };
export async function aging(type: 'customer' | 'supplier'): Promise<AgingRow[]> {
  const parties = (await partyBalances(type)).filter((p) => p.balance > 0.005);
  const tbl = type === 'customer' ? 'sales_invoices' : 'purchase_invoices';
  const inv = (await db.execute(sql.raw(`select party_id, (current_date - date)::int as age, (total - returned)::float as net from ${tbl} where status='active' and party_id is not null order by date desc, id desc`))).rows as { party_id: number; age: number; net: number }[];
  const by = new Map<number, { age: number; net: number }[]>(); for (const i of inv) { if (!by.has(i.party_id)) by.set(i.party_id, []); by.get(i.party_id)!.push(i); }
  return parties.map((p) => {
    let rem = p.balance; const r = { b0: 0, b31: 0, b61: 0, b90: 0, oldest: 0 };
    for (const i of by.get(p.id) ?? []) { if (rem <= 0.005) break; const take = Math.min(i.net, rem); if (take <= 0) continue; rem -= take; r.oldest = Math.max(r.oldest, i.age); if (i.age <= 30) r.b0 += take; else if (i.age <= 60) r.b31 += take; else if (i.age <= 90) r.b61 += take; else r.b90 += take; }
    if (rem > 0.005) { r.b90 += rem; r.oldest = Math.max(r.oldest, 91); }
    return { id: p.id, name: p.name, phone: p.phone, balance: p.balance, ...r };
  }).sort((a, b) => b.balance - a.balance);
}
export function waLink(phone: string | null | undefined, text: string) {
  if (!phone) return null; let d = phone.replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '249' + d.slice(1); else if (d.length === 9) d = '249' + d; if (d.length < 8) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

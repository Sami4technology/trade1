import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { currentBranch } from '@/lib/branch';
import { aging, waLink } from '@/lib/queries';
import { Card, PageHeader } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
type Item = { key: string; text: string; sub?: string; href?: string; wa?: string | null };
function Section({ title, items, empty }: { title: string; items: Item[]; empty: string }) {
  return (<Card className="mb-4"><h2 className="mb-2 font-semibold">{title} <span className="text-sm font-normal text-gray-500">({items.length})</span></h2>
    {!items.length ? <p className="text-sm text-gray-400">{empty}</p> : <ul className="divide-y text-sm">{items.map((x) => <li key={x.key} className="flex flex-wrap items-center justify-between gap-2 py-2"><div>{x.href ? <Link className="text-brand" href={x.href}>{x.text}</Link> : x.text}{x.sub && <div className="text-xs text-gray-500">{x.sub}</div>}</div>{x.wa && <a href={x.wa} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white">واتساب</a>}</li>)}</ul>}</Card>);
}
export default async function Alerts() {
  const b = await currentBranch(); const bf = (c: string) => (b ? sql.raw(`and ${c}=${b}`) : sql``);
  const [ag, late, low, chq, plans, quotes, co] = await Promise.all([aging('customer'),
    db.execute(sql`select r.id, r.number, a.name as asset, p.name as party, p.phone, r.expected_end::text as due, (current_date - r.expected_end)::int as days from rentals r join assets a on a.id=r.asset_id join parties p on p.id=r.party_id where r.status='active' and r.expected_end < current_date ${bf('r.branch_id')} order by r.expected_end`),
    db.execute(sql`select p.code, p.name, br.name as branch, s.qty::float as qty, p.min_qty::float as min from stock s join products p on p.id=s.product_id join branches br on br.id=s.branch_id where p.active and p.min_qty>0 and s.qty<=p.min_qty ${bf('s.branch_id')} order by s.qty limit 30`),
    db.execute(sql`select c.id, c.number, c.direction, c.amount::float as amount, c.due_date::text as due, (c.due_date - current_date)::int as left, p.name as party, p.phone from cheques c join parties p on p.id=c.party_id where c.status='pending' and c.due_date <= current_date + 7 ${bf('c.branch_id')} order by c.due_date`),
    db.execute(sql`select mp.title, a.code, a.name, mp.next_due::text as due from maintenance_plans mp join assets a on a.id=mp.asset_id where mp.active and mp.next_due <= current_date + 3 ${bf('a.branch_id')} order by mp.next_due`),
    db.execute(sql`select q.id, q.number, coalesce(p.name,q.customer_name) as party, p.phone, q.valid_until::text as due, q.total::float as total from quotes q left join parties p on p.id=q.party_id where q.status='open' and q.valid_until between current_date - 30 and current_date + 3 ${bf('q.branch_id')} order by q.valid_until`),
    db.execute(sql`select value from settings where key='company_name'`)]);
  const company = (co.rows[0] as { value: string } | undefined)?.value ?? 'الشركة';
  type R = Record<string, string | number | null>;
  const debts: Item[] = ag.filter((x) => x.oldest > 30).slice(0, 40).map((x) => ({ key: 'd' + x.id, text: `${x.name} — ${fmt(x.balance)}`, sub: `أقدم مستحق ${x.oldest > 90 ? 'أكثر من 90' : x.oldest} يوم${x.b90 > 0 ? ` · منها فوق 90: ${fmt(x.b90)}` : ''}`, href: `/parties/${x.id}`, wa: waLink(x.phone, `السلام عليكم ${x.name}، نذكّركم بوجود رصيد مستحق قدره ${fmt(x.balance)} لدى ${company}. نرجو التكرم بالسداد. شكراً.`) }));
  const lateItems: Item[] = (late.rows as R[]).map((x) => ({ key: 'r' + x.id, text: `${x.asset} — ${x.party}`, sub: `كان موعد الإرجاع ${x.due} (متأخر ${x.days} يوم) · ${x.number}`, href: `/rentals/${x.id}`, wa: waLink(x.phone as string, `السلام عليكم ${x.party}، موعد إرجاع المعدة (${x.asset}) كان بتاريخ ${x.due}. نرجو التواصل لترتيب الإرجاع أو التمديد. ${company}`) }));
  const lowItems: Item[] = (low.rows as R[]).map((x, i) => ({ key: 'l' + i, text: `${x.code} — ${x.name}`, sub: `${x.branch}: المتاح ${fmt(x.qty)} (الحد ${fmt(x.min)})` }));
  const chqItems: Item[] = (chq.rows as R[]).map((x) => ({ key: 'c' + x.id, text: `${x.direction === 'in' ? 'مستلم من' : 'صادر إلى'} ${x.party} — ${fmt(x.amount)}`, sub: `شيك ${x.number} · ${Number(x.left) < 0 ? `مستحق منذ ${-Number(x.left)} يوم` : Number(x.left) === 0 ? 'يستحق اليوم' : `يستحق خلال ${x.left} يوم`} (${x.due})`, href: '/cheques' }));
  const planItems: Item[] = (plans.rows as R[]).map((x, i) => ({ key: 'p' + i, text: `${x.code} — ${x.name}: ${x.title}`, sub: `الاستحقاق ${fmtDate(x.due as string)}`, href: '/plans' }));
  const qItems: Item[] = (quotes.rows as R[]).map((x) => ({ key: 'q' + x.id, text: `${x.number} — ${x.party} (${fmt(x.total)})`, sub: `ينتهي ${x.due}`, href: `/quotes/${x.id}`, wa: waLink(x.phone as string, `السلام عليكم ${x.party}، نذكّركم بعرض السعر رقم ${x.number} من ${company} الذي ينتهي بتاريخ ${x.due}. هل ترغبون بالتأكيد؟`) }));
  return (<div className="max-w-3xl"><PageHeader title="التنبيهات والمتابعة" />
    <p className="mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-800">زر «واتساب» يفتح المحادثة مع العميل ورسالة جاهزة تضغط عليها إرسال بنفسك. (الإرسال التلقائي يتطلب حساب WhatsApp Business API مدفوعاً.)</p>
    <Section title="ديون متأخرة (أكثر من 30 يوماً)" items={debts} empty="لا توجد ديون متأخرة" /><Section title="معدات مؤجرة متأخرة عن الإرجاع" items={lateItems} empty="لا توجد" />
    <Section title="شيكات مستحقة أو تستحق خلال 7 أيام" items={chqItems} empty="لا توجد" /><Section title="أصناف تحت حد الطلب" items={lowItems} empty="المخزون كافٍ" />
    <Section title="صيانة وقائية مستحقة" items={planItems} empty="لا توجد" /><Section title="عروض أسعار تنتهي قريباً" items={qItems} empty="لا توجد" /></div>);
}

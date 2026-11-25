import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch, visibleTreasuries } from '@/lib/branch';
import { settleCheque } from '@/lib/actions';
import { Badge, Btn, Card, PageHeader, Select, Table, Td } from '@/components/ui';
import { chqSt, fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Cheques({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams; const st = status ?? 'pending'; const b = await currentBranch(); const c = []; if (b) c.push(eq(s.cheques.branchId, b)); if (st !== 'all') c.push(eq(s.cheques.status, st));
  const [rows, tre] = await Promise.all([db.select({ c: s.cheques, p: s.parties.name }).from(s.cheques).innerJoin(s.parties, eq(s.parties.id, s.cheques.partyId)).where(c.length ? and(...c) : undefined).orderBy(s.cheques.dueDate, desc(s.cheques.id)).limit(300), visibleTreasuries()]);
  const today = new Date().toISOString().slice(0, 10); const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const pend = rows.filter((x) => x.c.status === 'pending'); const sum = (d: string) => pend.filter((x) => x.c.direction === d).reduce((a, x) => a + Number(x.c.amount), 0);
  return (<div><PageHeader title="الشيكات" action={{ href: '/cheques/new', label: '+ شيك' }} />
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><Card><div className="text-sm text-gray-500">شيكات مستلمة معلّقة (لنا)</div><div className="text-2xl font-bold text-green-700">{fmt(sum('in'))}</div></Card><Card><div className="text-sm text-gray-500">شيكات صادرة معلّقة (علينا)</div><div className="text-2xl font-bold text-red-700">{fmt(sum('out'))}</div></Card></div>
    <div className="mb-4 flex gap-2 text-sm">{[['pending', 'معلّقة'], ['cleared', 'تمت'], ['bounced', 'مرتدة'], ['all', 'الكل']].map(([k, l]) => <Link key={k} href={`/cheques?status=${k}`} className={`rounded-lg border px-3 py-1.5 ${st === k ? 'bg-brand text-white' : 'bg-white'}`}>{l}</Link>)}</div>
    <Table head={['الشيك', 'النوع', 'الطرف', 'البنك', 'المبلغ', 'الاستحقاق', 'الحالة / إجراء']}>{rows.map(({ c: x, p }) => <tr key={x.id}><Td>{x.number}</Td><Td>{x.direction === 'in' ? 'مستلم' : 'صادر'}</Td><Td>{p}</Td><Td>{x.bank ?? '—'}</Td><Td>{fmt(x.amount)}</Td>
      <Td>{fmtDate(x.dueDate)}{x.status === 'pending' && String(x.dueDate) < today && <span className="mr-1 text-xs font-semibold text-red-600">مستحق</span>}{x.status === 'pending' && String(x.dueDate) >= today && String(x.dueDate) <= soon && <span className="mr-1 text-xs text-amber-700">قريباً</span>}</Td>
      <Td>{x.status !== 'pending' ? <Badge cls={chqSt[x.status].cls}>{chqSt[x.status].label}</Badge> : <form action={settleCheque} className="flex flex-wrap items-center gap-1"><input type="hidden" name="id" value={x.id} /><div className="w-36"><Select name="treasuryId"><option value="">الخزينة…</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div><button name="result" value="clear" className="rounded-lg bg-green-600 px-2 py-1.5 text-xs text-white">{x.direction === 'in' ? 'تحصيل' : 'صرف'}</button><button name="result" value="bounce" className="rounded-lg border border-red-500 px-2 py-1.5 text-xs text-red-600">ارتد</button></form>}</Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد شيكات</Td>{[1, 2, 3, 4, 5, 6].map((i) => <Td key={i} />)}</tr>}</Table>
    <p className="mt-3 text-xs text-gray-500">الشيك المعلّق لا يغيّر رصيد العميل أو الخزينة إلا عند التحصيل/الصرف.</p></div>);
}

import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, Btn, Card, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
const st: Record<string, { label: string; cls: string }> = { active: { label: 'نشط', cls: 'bg-purple-100 text-purple-800' }, returned: { label: 'أُرجعت', cls: 'bg-green-100 text-green-800' }, cancelled: { label: 'ملغي', cls: 'bg-gray-100 text-gray-600' } };
export default async function Rentals({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams; const b = await currentBranch(); const c = []; if (b) c.push(eq(s.rentals.branchId, b)); if (status) c.push(eq(s.rentals.status, status));
  const rows = await db.select({ r: s.rentals, a: s.assets.name, code: s.assets.code, p: s.parties.name }).from(s.rentals).innerJoin(s.assets, eq(s.assets.id, s.rentals.assetId)).innerJoin(s.parties, eq(s.parties.id, s.rentals.partyId)).where(c.length ? and(...c) : undefined).orderBy(desc(s.rentals.id)).limit(200);
  const today = new Date().toISOString().slice(0, 10); const late = (r: typeof rows[0]['r']) => r.status === 'active' && r.expectedEnd && String(r.expectedEnd) < today;
  const active = rows.filter((x) => x.r.status === 'active'); const nLate = active.filter((x) => late(x.r)).length; const daily = active.reduce((a, x) => a + Number(x.r.dailyRate), 0);
  return (<div><PageHeader title="تأجير المعدات" action={{ href: '/rentals/new', label: '+ عقد تأجير' }} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Card><div className="text-sm text-gray-500">عقود نشطة</div><div className="text-2xl font-bold">{active.length}</div></Card><Card><div className="text-sm text-gray-500">متأخرة عن الإرجاع</div><div className={`text-2xl font-bold ${nLate ? 'text-red-600' : ''}`}>{nLate}</div></Card><Card><div className="text-sm text-gray-500">إيراد يومي جارٍ</div><div className="text-2xl font-bold">{fmt(daily)}</div></Card></div>
    <form className="mb-4 flex gap-2"><div className="w-40"><Select name="status" defaultValue={status ?? ''}><option value="">كل الحالات</option>{Object.entries(st).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div><Btn variant="ghost">تصفية</Btn></form>
    <Table head={['الرقم', 'المعدة', 'العميل', 'من', 'الإرجاع المتوقع', 'السعر/يوم', 'الحالة']}>{rows.map(({ r, a, code, p }) => <tr key={r.id}><Td><Link className="font-medium text-brand" href={`/rentals/${r.id}`}>{r.number}</Link></Td><Td>{code} — {a}</Td><Td>{p}</Td><Td>{fmtDate(r.startDate)}</Td><Td>{fmtDate(r.expectedEnd)}</Td><Td>{fmt(r.dailyRate)}</Td><Td><Badge cls={st[r.status].cls}>{st[r.status].label}</Badge>{late(r) && <span className="mr-2 text-xs font-semibold text-red-600">متأخر</span>}</Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد عقود</Td>{[1, 2, 3, 4, 5, 6].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

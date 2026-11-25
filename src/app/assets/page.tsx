import Link from 'next/link';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, Btn, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { assetStatus, criticality } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Assets({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams; const b = await currentBranch(); const c = [];
  if (b) c.push(eq(s.assets.branchId, b)); if (status) c.push(eq(s.assets.status, status));
  if (q) c.push(or(ilike(s.assets.name, `%${q}%`), ilike(s.assets.code, `%${q}%`), ilike(s.assets.serial, `%${q}%`)));
  const rows = await db.select({ a: s.assets, br: s.branches.name }).from(s.assets).innerJoin(s.branches, eq(s.branches.id, s.assets.branchId)).where(c.length ? and(...c) : undefined).orderBy(s.assets.code);
  return (<div><PageHeader title="معدات الشركة (أصول وصيانة)" action={{ href: '/assets/new', label: '+ معدة جديدة' }} />
    <form className="mb-4 flex gap-2"><div className="w-64"><Input name="q" defaultValue={q} placeholder="بحث بالاسم / الكود / الرقم التسلسلي" /></div><div className="w-40"><Select name="status" defaultValue={status ?? ''}><option value="">كل الحالات</option>{Object.entries(assetStatus).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div><Btn variant="ghost">تصفية</Btn></form>
    <Table head={['الكود', 'الاسم', 'الفئة', 'الفرع / القسم', 'الأهمية', 'الحالة']}>{rows.map(({ a, br }) => <tr key={a.id}><Td><Link className="font-medium text-brand" href={`/assets/${a.id}`}>{a.code}</Link></Td><Td>{a.name}</Td><Td>{a.category ?? '—'}</Td><Td>{br}</Td><Td>{criticality[a.criticality]}</Td><Td><Badge cls={assetStatus[a.status].cls}>{assetStatus[a.status].label}</Badge></Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد معدات</Td>{[1, 2, 3, 4, 5].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

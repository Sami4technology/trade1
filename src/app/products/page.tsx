import Link from 'next/link';
import { eq, ilike, or, and } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { Badge, Btn, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmt, kinds } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { q, kind } = await searchParams; const conds = [];
  if (q) conds.push(or(ilike(s.products.name, `%${q}%`), ilike(s.products.code, `%${q}%`)));
  if (kind) conds.push(eq(s.categories.kind, kind));
  const rows = await db.select({ p: s.products, c: s.categories }).from(s.products).leftJoin(s.categories, eq(s.categories.id, s.products.categoryId)).where(conds.length ? and(...conds) : undefined).orderBy(s.products.code);
  return (<div><PageHeader title="الأصناف" action={{ href: '/products/new', label: '+ صنف جديد' }} />
    <form className="mb-4 flex gap-2"><div className="w-64"><Input name="q" defaultValue={q} placeholder="بحث بالاسم / الكود" /></div>
      <div className="w-44"><Select name="kind" defaultValue={kind ?? ''}><option value="">كل الأقسام</option>{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div><Btn variant="ghost">تصفية</Btn></form>
    <Table head={['الكود', 'الصنف', 'القسم', 'الوحدة', 'متوسط التكلفة', 'سعر البيع', '$', 'هامش', '']}>
      {rows.map(({ p, c }) => { const m = Number(p.salePrice) > 0 ? ((Number(p.salePrice) - Number(p.avgCost)) / Number(p.salePrice)) * 100 : 0; return (
        <tr key={p.id}><Td>{p.code}</Td><Td>{p.name}</Td><Td>{c ? <Badge cls="bg-blue-50 text-blue-800">{kinds[c.kind]} · {c.name}</Badge> : '—'}</Td><Td>{p.unit}</Td><Td>{fmt(p.avgCost)}</Td><Td>{fmt(p.salePrice)}</Td><Td>{Number(p.usdPrice) > 0 ? fmt(p.usdPrice) : '—'}</Td><Td className={m < 10 ? 'text-red-700' : ''}>{m.toFixed(0)}%</Td><Td><Link className="text-xs text-brand" href={`/products/${p.id}`}>تعديل</Link></Td></tr>); })}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد أصناف</Td>{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

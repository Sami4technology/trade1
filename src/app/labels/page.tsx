import Link from 'next/link';
import { ilike, or } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import Barcode from '@/components/Barcode';
import PrintBtn from '@/components/PrintBtn';
import { Btn, Input, PageHeader } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Labels({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  const { kind, q } = await searchParams; const assets = kind === 'assets';
  const items = assets ? (await db.select().from(s.assets).where(q ? or(ilike(s.assets.name, `%${q}%`), ilike(s.assets.code, `%${q}%`)) : undefined).orderBy(s.assets.code).limit(120)).map((a) => ({ id: a.id, title: a.name, code: a.code, value: a.barcode || a.code }))
    : (await db.select().from(s.products).where(q ? or(ilike(s.products.name, `%${q}%`), ilike(s.products.code, `%${q}%`)) : undefined).orderBy(s.products.code).limit(120)).map((p) => ({ id: p.id, title: p.name, code: p.code, value: p.barcode || p.code }));
  return (<div><div className="print:hidden"><PageHeader title="طباعة ملصقات الباركود" />
    <form className="mb-4 flex flex-wrap items-center gap-2"><div className="flex gap-2 text-sm">{[['products', 'الأصناف'], ['assets', 'المعدات']].map(([k, l]) => <Link key={k} href={`/labels?kind=${k}`} className={`rounded-lg border px-3 py-1.5 ${(assets ? 'assets' : 'products') === k ? 'bg-brand text-white' : 'bg-white'}`}>{l}</Link>)}</div><input type="hidden" name="kind" value={assets ? 'assets' : 'products'} /><div className="w-56"><Input name="q" defaultValue={q} placeholder="بحث لتحديد ما يُطبع" /></div><Btn variant="ghost">بحث</Btn><PrintBtn /></form>
    <p className="mb-3 text-xs text-gray-500">القيمة المطبوعة = الباركود المسجل، وإن لم يوجد فالكود. اطبع على ورق ملصقات وألصقها، ثم امسحها بقارئ USB في الفواتير والجرد.</p></div>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 print:grid-cols-4">{items.map((x) => <div key={x.id} className="break-inside-avoid rounded border bg-white p-2 text-center"><div className="truncate text-xs font-semibold">{x.title}</div><Barcode value={x.value} /></div>)}</div></div>);
}

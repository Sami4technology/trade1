import { desc, eq, ilike, and, sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { Btn, Input, PageHeader, Select, Table, Td } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Audit({ searchParams }: { searchParams: Promise<{ user?: string; entity?: string }> }) {
  const { user, entity } = await searchParams; const c = [];
  if (user) c.push(ilike(s.auditLog.userName, `%${user}%`)); if (entity) c.push(eq(s.auditLog.entity, entity));
  const rows = await db.select().from(s.auditLog).where(c.length ? and(...c) : undefined).orderBy(desc(s.auditLog.id)).limit(300);
  const ents = (await db.execute(sql`select distinct entity from audit_log order by 1`)).rows as { entity: string }[];
  const fmtT = (d: Date) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Khartoum', hour12: false });
  return (<div><PageHeader title="سجل النشاط" /><form className="mb-4 flex gap-2"><div className="w-48"><Input name="user" defaultValue={user} placeholder="اسم المستخدم" /></div>
    <div className="w-44"><Select name="entity" defaultValue={entity ?? ''}><option value="">كل الأنواع</option>{ents.map((e) => <option key={e.entity} value={e.entity}>{e.entity}</option>)}</Select></div><Btn variant="ghost">تصفية</Btn></form>
    <Table head={['الوقت', 'المستخدم', 'العملية', 'المرجع', 'تفاصيل']}>{rows.map((r) => <tr key={r.id}><Td className="whitespace-nowrap">{fmtT(r.at)}</Td><Td>{r.userName ?? '—'}</Td><Td>{r.action}</Td><Td>{r.ref}</Td><Td>{r.details}</Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد سجلات</Td><Td /><Td /><Td /><Td /></tr>}</Table></div>);
}

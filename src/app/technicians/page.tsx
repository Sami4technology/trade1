import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { allBranches } from '@/lib/branch';
import { createTechnician } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Table, Td } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Techs() {
  const [rows, br] = await Promise.all([db.select({ t: s.technicians, b: s.branches.name }).from(s.technicians).leftJoin(s.branches, eq(s.branches.id, s.technicians.branchId)).orderBy(s.technicians.name), allBranches()]);
  return (<div className="max-w-3xl"><PageHeader title="الفنيون" /><Card className="mb-5"><form action={createTechnician} className="flex flex-wrap items-end gap-3">
    <div className="flex-1"><Field label="الاسم *"><Input name="name" required /></Field></div><div className="w-36"><Field label="الهاتف"><Input name="phone" /></Field></div><div className="w-36"><Field label="التخصص"><Input name="specialty" /></Field></div>
    <div className="w-40"><Field label="الفرع / القسم"><Select name="branchId"><option value="">الكل</option>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field></div><Btn>إضافة</Btn></form></Card>
    <Table head={['الاسم', 'الهاتف', 'التخصص', 'الفرع']}>{rows.map(({ t, b }) => <tr key={t.id}><Td>{t.name}</Td><Td>{t.phone ?? '—'}</Td><Td>{t.specialty ?? '—'}</Td><Td>{b ?? 'الكل'}</Td></tr>)}</Table></div>);
}

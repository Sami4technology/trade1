import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { createUser, resetPassword, toggleUser } from '@/lib/actions';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, Table, Td } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Users() {
  const rows = await db.select({ u: s.users, b: s.branches.name }).from(s.users).leftJoin(s.branches, eq(s.branches.id, s.users.branchId)).orderBy(s.users.id);
  const br = await db.select().from(s.branches);
  return (<div className="max-w-4xl"><PageHeader title="المستخدمون والصلاحيات" />
    <Card className="mb-5"><form action={createUser} className="grid items-end gap-3 md:grid-cols-5">
      <Field label="الاسم"><Input name="name" required /></Field><Field label="اسم الدخول"><Input name="username" required dir="ltr" /></Field><Field label="كلمة المرور"><Input name="password" type="password" minLength={6} required /></Field>
      <Field label="الدور"><Select name="role"><option value="branch">موظف فرع</option><option value="admin">مدير (كل الصلاحيات)</option></Select></Field>
      <Field label="الفرع / القسم (للموظف)"><Select name="branchId"><option value="">—</option>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <div className="md:col-span-5"><Btn>إضافة مستخدم</Btn> <span className="text-xs text-gray-500">موظف الفرع/القسم يعمل على وحدته فقط، ولا يرى الإعدادات ولا التقارير ولا المستخدمين.</span></div></form></Card>
    <Table head={['الاسم', 'اسم الدخول', 'الدور', 'الفرع', 'الحالة', 'إجراءات']}>{rows.map(({ u, b }) => <tr key={u.id}><Td>{u.name}</Td><Td><span dir="ltr">{u.username}</span></Td><Td>{u.role === 'admin' ? 'مدير' : 'موظف فرع'}</Td><Td>{b ?? 'كل الفروع'}</Td><Td><Badge cls={u.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}>{u.active ? 'فعّال' : 'موقوف'}</Badge></Td>
      <Td><div className="flex flex-wrap gap-3"><form action={resetPassword} className="flex gap-1"><input type="hidden" name="id" value={u.id} /><input name="password" type="password" minLength={6} placeholder="كلمة مرور جديدة" className="w-32 rounded border px-2 py-1 text-xs" required /><button className="text-xs text-brand">تغيير</button></form>
        <form action={toggleUser}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.active ? '0' : '1'} /><button className="text-xs text-gray-600">{u.active ? 'إيقاف' : 'تفعيل'}</button></form></div></Td></tr>)}</Table></div>);
}

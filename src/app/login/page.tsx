import { login } from '@/lib/actions';
import { Btn, Input } from '@/components/ui';
export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (<div className="flex min-h-screen items-center justify-center"><form action={login} className="w-80 space-y-4 rounded-xl border bg-white p-6 shadow">
    <h1 className="text-xl font-bold">🏗️ نظام المبيعات والمخزون</h1><Input name="username" placeholder="اسم المستخدم" required autoFocus /><Input name="password" type="password" placeholder="كلمة المرور"  required />
    {true && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><b>نسخة تجريبية</b><br />المدير: <code>demo</code><br />موظف فرع: <code>portsudan</code><br />كلمة المرور: <code>{process.env.DEMO_PASSWORD || 'demo1234'}</code></div>}
    {e && <p className="text-sm text-red-600">كلمة المرور غير صحيحة</p>}<Btn>دخول</Btn></form></div>);
}

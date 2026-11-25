import './globals.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { logout } from '@/lib/actions';
import { allBranches } from '@/lib/branch';
import BranchSwitch from '@/components/BranchSwitch';
import { getSession } from '@/lib/session';
import { db, schema as s } from '@/db';
import { eq } from 'drizzle-orm';
import PwaRegister from '@/components/PwaRegister';
export const metadata = { title: 'نظام المبيعات والمخزون والمحاسبة', appleWebApp: { capable: true, title: 'المبيعات', statusBarStyle: 'default' as const }, icons: { apple: '/icon-192.png' } };
export const viewport = { themeColor: '#0f4c81', width: 'device-width', initialScale: 1 };
const nav: [string, [string, string][]][] = [
  ['', [['/', 'لوحة التحكم'], ['/alerts', 'التنبيهات والمتابعة'], ['/field', 'واجهة الفنيين (جوال)']]],
  ['المبيعات والمشتريات', [['/sales', 'فواتير المبيعات'], ['/purchases', 'فواتير المشتريات'], ['/quotes', 'عروض الأسعار'], ['/returns', 'المرتجعات'], ['/parties?type=customer', 'العملاء'], ['/parties?type=supplier', 'الموردون']]],
  ['المخزون', [['/products', 'الأصناف'], ['/stock', 'أرصدة المخزون'], ['/stock/transfers', 'التحويل بين الفروع'], ['/stocktakes', 'الجرد الفعلي'], ['/labels', 'ملصقات الباركود']]],
  ['الخدمات', [['/jobs', 'صيانة الجملونات والهناجر'], ['/rentals', 'تأجير المعدات']]],
  ['صيانة المعدات', [['/assets', 'معدات الشركة'], ['/work-orders', 'أوامر العمل'], ['/plans', 'الصيانة الوقائية'], ['/technicians', 'الفنيون']]],
  ['المحاسبة', [['/accounts', 'الخزائن والسندات'], ['/cheques', 'الشيكات'], ['/expenses', 'المصروفات'], ['/reports', 'التقارير'], ['/reports/aging', 'تقادم الديون'], ['/reports/assets', 'الأصول والإهلاك']]],
  ['', [['/users', 'المستخدمون'], ['/audit', 'سجل النشاط'], ['/settings', 'الإعدادات']]],
];
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies(); const authed = !!c.get('eq_session');
  const se = authed ? await getSession() : null; const admin = se?.role === 'admin';
  const branches = authed ? await allBranches() : [];
  const [me] = se ? await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, se.uid)) : [];
  const navEl = (<nav className="space-y-3">{nav.map(([g, items], i) => (<div key={i}>{g && <div className="mb-1 text-xs text-gray-500">{g}</div>}{items.filter(([h]) => admin || !['/users', '/settings', '/reports', '/reports/aging', '/reports/assets', '/audit'].includes(h)).map(([h, l]) => <Link key={h} href={h} className="block rounded-lg px-3 py-1.5 text-sm hover:bg-gray-800">{l}</Link>)}</div>))}</nav>);
  return (
    <html lang="ar" dir="rtl"><body><PwaRegister />
      {authed ? (<div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 md:block bg-gray-900 p-4 text-gray-200 print:hidden">
          <div className="mb-4 text-lg font-bold text-white">🏗️ المبيعات والمخزون</div>
          <div className="mb-4"><div className="mb-1 text-xs text-gray-400">{me?.name}</div>{admin ? <BranchSwitch branches={branches} current={c.get('branch')?.value ?? 'all'} /> : <div className="rounded-lg bg-gray-800 px-2 py-1.5 text-sm">{branches[0]?.name}</div>}</div>
          {navEl}
          <form action={logout} className="mt-6"><button className="text-sm text-gray-400 hover:text-white">تسجيل الخروج</button></form>
        </aside>
        <div className="min-w-0 flex-1"><details className="border-b bg-gray-900 p-3 text-gray-200 md:hidden print:hidden"><summary className="cursor-pointer font-bold text-white">☰ القائمة — {me?.name}</summary><div className="mt-3">{navEl}<form action={logout} className="mt-4"><button className="text-sm text-gray-400">تسجيل الخروج</button></form></div></details><main className="p-4 md:p-6">{children}</main></div></div>) : children}
    </body></html>
  );
}

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
import { SideNav, SectionTabs, SearchBox, NewMenu, BottomBar, ThemeToggle } from '@/components/Nav';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
export const metadata = { title: 'نظام المبيعات والمخزون والمحاسبة', appleWebApp: { capable: true, title: 'المبيعات', statusBarStyle: 'default' as const }, icons: { apple: '/icon-192.png' } };
export const viewport = { themeColor: '#0f4c81', width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies(); const authed = !!c.get('eq_session');
  const se = authed ? await getSession() : null; const admin = se?.role === 'admin';
  const branches = authed ? await allBranches() : [];
  const [me] = se ? await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, se.uid)) : [];
  return (
    <html lang="ar" dir="rtl"><head><script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} /></head><body><PwaRegister />{true && <div className="bg-amber-400 px-3 py-1 text-center text-sm font-semibold text-black print:hidden">🧪 نسخة تجريبية — بيانات وهمية للعرض فقط، لا تدخل بيانات حقيقية</div>}
      {authed ? (<div className="flex min-h-screen">
        <div className="hidden w-[72px] shrink-0 md:block print:hidden"><aside className="keep-colors group fixed bottom-0 right-0 top-0 z-30 w-[72px] overflow-hidden bg-gray-900 p-3 text-gray-200 shadow-xl transition-[width] duration-200 hover:w-60 focus-within:w-60">
          <div className="mb-4 flex items-center gap-3 px-1 py-2 text-white"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-lg">🏗️</span><span className="hidden whitespace-nowrap font-bold group-hover:inline group-focus-within:inline">المبيعات والمخزون</span></div>
          <div className="mb-4 hidden group-hover:block group-focus-within:block"><div className="mb-1 whitespace-nowrap text-xs text-gray-400">{me?.name}</div>{admin ? <BranchSwitch branches={branches} current={c.get('branch')?.value ?? 'all'} /> : <div className="rounded-lg bg-gray-800 px-2 py-1.5 text-sm">{branches[0]?.name}</div>}</div>
          <SideNav admin={admin} />
          <form action={logout} className="mt-6 hidden group-hover:block group-focus-within:block"><button className="text-sm text-gray-400 hover:text-white">تسجيل الخروج</button></form>
        </aside></div>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-white/95 px-3 py-2 backdrop-blur md:px-6 print:hidden"><span className="font-bold text-brand md:hidden">🏗️</span><SearchBox /><NewMenu /><ThemeToggle /></header>
          <main className="p-4 pb-24 md:p-6"><SectionTabs admin={admin} />{children}</main>
        </div>
        <BottomBar admin={admin}><div className="mb-3 text-sm text-gray-600">{me?.name}</div>{admin ? <BranchSwitch branches={branches} current={c.get('branch')?.value ?? 'all'} /> : <div className="rounded-lg bg-gray-100 px-2 py-1.5 text-sm">{branches[0]?.name}</div>}<form action={logout} className="mt-4"><button className="rounded-lg border px-4 py-2 text-sm text-red-700">تسجيل الخروج</button></form></BottomBar></div>) : children}
    </body></html>
  );
}

'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, ReactNode, Suspense } from 'react';
import { visibleSections, locate, newLinks } from '@/lib/nav';
import { LayoutDashboard, ShoppingCart, Truck, Boxes, Wrench, BarChart3, FileText, ClipboardList, CalendarClock, HardHat, AlertTriangle, UserPlus, Banknote, Menu, Plus, Search, Moon, Sun, X } from 'lucide-react';
const IC: Record<string, any> = { LayoutDashboard, ShoppingCart, Truck, Boxes, Wrench, BarChart3, FileText, ClipboardList, CalendarClock, HardHat, AlertTriangle, UserPlus, Banknote };
const Ic = ({ n, className = 'h-5 w-5' }: { n: string; className?: string }) => { const C = IC[n] ?? FileText; return <C className={className} strokeWidth={1.8} />; };

function useLoc(admin: boolean) {
  const pathname = usePathname(); const sp = useSearchParams(); const secs = visibleSections(admin);
  const search = sp.toString(); return { secs, pathname, loc: locate(secs, pathname, search), search };
}
function SideInner({ admin }: { admin: boolean }) {
  const { secs, loc } = useLoc(admin);
  return (<nav className="space-y-1">{secs.map((s) => { const on = loc?.sec.key === s.key; return (
    <Link key={s.key} href={s.items[0].href} title={s.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${on ? 'bg-white/10 font-semibold text-white shadow-[inset_-3px_0_0_#60a5fa]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}><Ic n={s.icon} className="h-5 w-5 shrink-0" /><span className="hidden whitespace-nowrap group-hover:inline group-focus-within:inline">{s.label}</span></Link>); })}</nav>);
}
export function SideNav({ admin }: { admin: boolean }) { return <Suspense fallback={null}><SideInner admin={admin} /></Suspense>; }

function TabsInner({ admin }: { admin: boolean }) {
  const { loc } = useLoc(admin); if (!loc || loc.sec.items.length < 2) return null;
  return (<div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden">{loc.sec.items.map((i) => { const on = i.href === loc.item.href; return (
    <Link key={i.href} href={i.href} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${on ? 'border-brand font-semibold text-brand' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>{i.label}</Link>); })}</div>);
}
export function SectionTabs({ admin }: { admin: boolean }) { return <Suspense fallback={null}><TabsInner admin={admin} /></Suspense>; }

export function SearchBox() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); ref.current?.focus(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  return (<form action="/search" className="relative min-w-0 flex-1 md:max-w-md"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input ref={ref} name="q" type="search" placeholder="بحث سريع…" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-9 pl-12 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20" /><kbd className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 rounded border bg-white px-1.5 text-[10px] text-gray-400 md:block">/</kbd></form>);
}
export function NewMenu() {
  const [open, setOpen] = useState(false); const p = usePathname();
  useEffect(() => setOpen(false), [p]);
  return (<div className="relative"><button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"><Plus className="h-4 w-4" />جديد</button>
    {open && <><div className="fixed inset-0 z-30" onClick={() => setOpen(false)} /><div className="absolute left-0 z-40 mt-1 w-52 rounded-2xl border bg-white p-1.5 text-sm shadow-xl">{newLinks.map(([h, l, i]) => <Link key={h} href={h} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-gray-100"><Ic n={i} className="h-4 w-4 text-brand" />{l}</Link>)}</div></>}</div>);
}
function BarInner({ admin, children }: { admin: boolean; children?: ReactNode }) {
  const { secs, loc, pathname } = useLoc(admin); const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  const main = secs.filter((s) => ['home', 'sales', 'stock', 'equip'].includes(s.key));
  return (<>
    {more && <div className="fixed inset-0 z-40 overflow-y-auto bg-white p-4 pb-24 md:hidden"><div className="mb-3 flex items-center justify-between"><b>كل الأقسام</b><button onClick={() => setMore(false)}><X className="h-6 w-6" /></button></div>
      {secs.map((s) => <div key={s.key} className="mb-4"><div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-500"><Ic n={s.icon} className="h-4 w-4" />{s.label}</div><div className="grid grid-cols-2 gap-2">{s.items.map((i) => <Link key={i.href} href={i.href} className="rounded-xl border bg-gray-50 px-3 py-3 text-center text-sm">{i.label}</Link>)}</div></div>)}
      <div className="mt-4">{children}</div></div>}
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t bg-white/90 backdrop-blur md:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {main.map((s) => { const on = loc?.sec.key === s.key && !more; return <Link key={s.key} href={s.items[0].href} className={`flex flex-1 flex-col items-center py-2 text-[11px] ${on ? 'font-bold text-brand' : 'text-gray-600'}`}><Ic n={s.icon} className="mb-0.5 h-6 w-6" />{s.label.split(' ')[0]}</Link>; })}
      <button onClick={() => setMore(!more)} className={`flex flex-1 flex-col items-center py-2 text-[11px] ${more ? 'font-bold text-brand' : 'text-gray-600'}`}><Menu className="mb-0.5 h-6 w-6" strokeWidth={1.8} />المزيد</button>
    </nav></>);
}
export function BottomBar({ admin, children }: { admin: boolean; children?: ReactNode }) { return <Suspense fallback={null}><BarInner admin={admin}>{children}</BarInner></Suspense>; }

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const go = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch {} };
  return <button onClick={go} aria-label="الوضع الداكن" title="الوضع الداكن" className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-100">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>;
}

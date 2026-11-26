export type NavItem = { href: string; label: string; admin?: boolean };
export type Section = { key: string; label: string; icon: string; items: NavItem[] };
export const sections: Section[] = [
  { key: 'home', label: 'الرئيسية', icon: 'LayoutDashboard', items: [{ href: '/', label: 'لوحة التحكم' }, { href: '/alerts', label: 'التنبيهات والمتابعة' }] },
  { key: 'sales', label: 'المبيعات', icon: 'ShoppingCart', items: [{ href: '/sales', label: 'فواتير المبيعات' }, { href: '/quotes', label: 'عروض الأسعار' }, { href: '/returns', label: 'المرتجعات' }, { href: '/parties?type=customer', label: 'العملاء' }, { href: '/cheques', label: 'الشيكات' }] },
  { key: 'purchases', label: 'المشتريات', icon: 'Truck', items: [{ href: '/purchases', label: 'فواتير المشتريات' }, { href: '/parties?type=supplier', label: 'الموردون' }] },
  { key: 'stock', label: 'المخزون', icon: 'Boxes', items: [{ href: '/products', label: 'الأصناف' }, { href: '/stock', label: 'أرصدة المخزون' }, { href: '/stock/transfers', label: 'التحويل بين الفروع' }, { href: '/stocktakes', label: 'الجرد الفعلي' }, { href: '/labels', label: 'ملصقات الباركود' }] },
  { key: 'equip', label: 'المعدات والصيانة', icon: 'Wrench', items: [{ href: '/assets', label: 'معدات الشركة' }, { href: '/work-orders', label: 'أوامر العمل' }, { href: '/plans', label: 'الصيانة الوقائية' }, { href: '/rentals', label: 'تأجير المعدات' }, { href: '/jobs', label: 'صيانة الجملونات والهناجر' }, { href: '/technicians', label: 'الفنيون' }, { href: '/field', label: 'واجهة الفنيين (جوال)' }] },
  { key: 'admin', label: 'التقارير والإعدادات', icon: 'BarChart3', items: [{ href: '/accounts', label: 'الخزائن والسندات' }, { href: '/expenses', label: 'المصروفات' }, { href: '/reports', label: 'التقارير', admin: true }, { href: '/reports/aging', label: 'تقادم الديون', admin: true }, { href: '/reports/assets', label: 'الأصول والإهلاك', admin: true }, { href: '/users', label: 'المستخدمون', admin: true }, { href: '/audit', label: 'سجل النشاط', admin: true }, { href: '/settings', label: 'الإعدادات', admin: true }] },
];
export function visibleSections(admin: boolean): Section[] {
  return sections.map((s) => ({ ...s, items: s.items.filter((i) => admin || !i.admin) })).filter((s) => s.items.length);
}
const pathOf = (h: string) => h.split('?')[0];
// يحدد (القسم، العنصر) الأنسب للمسار الحالي بأطول تطابق
export function locate(secs: Section[], pathname: string, search: string): { sec: Section; item: NavItem } | null {
  let best: { sec: Section; item: NavItem; score: number } | null = null;
  for (const sec of secs) for (const item of sec.items) {
    const p = pathOf(item.href); const ok = p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/');
    if (!ok) continue;
    let score = p.length; if (item.href.includes('?') && search && item.href.split('?')[1] === search.replace(/^\?/, '')) score += 100;
    else if (item.href.includes('?') && pathname === p && !search.includes(item.href.split('?')[1])) score -= 50;
    if (!best || score > best.score) best = { sec, item, score };
  }
  // صفحة تفاصيل عميل/مورد بلا type → المبيعات
  return best ? { sec: best.sec, item: best.item } : null;
}
export const newLinks: [string, string, string][] = [['/sales/new', 'فاتورة بيع', 'FileText'], ['/purchases/new', 'فاتورة شراء', 'Truck'], ['/quotes/new', 'عرض سعر', 'ClipboardList'], ['/rentals/new', 'تأجير معدة', 'CalendarClock'], ['/jobs/new', 'أمر خدمة', 'HardHat'], ['/field/new', 'بلاغ عطل', 'AlertTriangle'], ['/parties/new', 'عميل / مورد', 'UserPlus'], ['/cheques/new', 'شيك', 'Banknote']];

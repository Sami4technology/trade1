// بيانات عرض تجريبية. تشغيل: DATABASE_URL=... DEMO_PASSWORD=... npx tsx src/db/seed-demo.ts
import { sql } from 'drizzle-orm';
import { db, schema as s } from './index';
import { hashPassword } from '../lib/password';
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.branches);
  if (n > 0) { console.log('القاعدة غير فارغة، تم الإلغاء حمايةً للبيانات'); process.exit(1); }
  const pass = process.env.DEMO_PASSWORD || 'demo1234';
  const br = await db.insert(s.branches).values([{ name: 'بورسودان' }, { name: 'الخرطوم' }, { name: 'قسم الحديد', kind: 'department' }]).returning();
  await db.insert(s.users).values([{ username: 'demo', name: 'مدير تجريبي', passwordHash: hashPassword(pass), role: 'admin' }, { username: 'portsudan', name: 'موظف بورسودان', passwordHash: hashPassword(pass), role: 'branch', branchId: br[0].id }]);
  await db.insert(s.settings).values([{ key: 'company_name', value: 'شركة النموذج للمعدات والحديد' }, { key: 'company_phone', value: '0912345678' }, { key: 'company_address', value: 'بورسودان - الخرطوم' }, { key: 'usd_rate', value: '2800' }]).onConflictDoNothing();
  const cat = await db.insert(s.categories).values([{ name: 'معدات ورش', kind: 'equipment' }, { name: 'معدات مصانع', kind: 'equipment' }, { name: 'أدوات سلامة', kind: 'safety' }, { name: 'حديد وقطاعات', kind: 'iron' }, { name: 'مواد جملونات', kind: 'material' }]).returning();
  const tr = await db.insert(s.treasury).values([{ name: 'خزينة بورسودان', branchId: br[0].id, type: 'cash', openingBalance: '500000' }, { name: 'خزينة الخرطوم', branchId: br[1].id, type: 'cash', openingBalance: '300000' }, { name: 'حساب بنك الخرطوم', type: 'bank', openingBalance: '2000000' }]).returning();
  const pa = await db.insert(s.parties).values([
    { name: 'شركة الأمل للمقاولات', type: 'customer', phone: '0911111111' }, { name: 'مصنع النيل للأغذية', type: 'customer', phone: '0922222222' }, { name: 'ورشة البحر الأحمر', type: 'customer', phone: '0933333333' },
    { name: 'مؤسسة الحديد الذهبي', type: 'supplier', phone: '0944444444' }, { name: 'الشركة العالمية للمعدات', type: 'supplier', phone: '0955555555' }]).returning();
  const P = [['EQ-001', 'ماكينة لحام 300 أمبير', 0, 'قطعة', 1500, 1000, 2, '600001'], ['EQ-002', 'جلاخة 9 بوصة', 0, 'قطعة', 300, 200, 5, '600002'], ['EQ-003', 'مولد كهرباء 5 ك.و', 1, 'قطعة', 2200, 1600, 2, '600003'], ['SF-001', 'خوذة سلامة', 2, 'قطعة', 25, 15, 20, '600004'], ['SF-002', 'حذاء سلامة', 2, 'زوج', 60, 40, 10, '600005'], ['SF-003', 'قفازات عمل', 2, 'زوج', 8, 4, 50, '600006'], ['IR-001', 'حديد تسليح 12 مم', 3, 'طن', 900, 750, 5, '600007'], ['IR-002', 'زاوية حديد 50 مم', 3, 'متر', 12, 8, 100, '600008'], ['MT-001', 'ألواح زنك للأسقف', 4, 'لوح', 30, 20, 50, '600009']] as const;
  const pr = await db.insert(s.products).values(P.map((p) => ({ code: p[0], name: p[1], categoryId: cat[p[2]].id, unit: p[3], salePrice: String(p[4]), avgCost: String(p[5]), minQty: String(p[6]), barcode: p[7] }))).returning();
  const stock = new Map<string, number>(); for (const p of pr) for (const b of br) stock.set(p.id + '-' + b.id, p.unit === 'طن' ? 12 : p.unit === 'متر' ? 600 : 40);
  let sn = 0;
  const sale = async (b: number, party: number | null, d: number, lines: [number, number][], paidPct: number, tre: number) => {
    const items = lines.map(([i, q]) => ({ p: pr[i], q })); const total = items.reduce((a, x) => a + x.q * Number(x.p.salePrice), 0); const paid = Math.round(total * paidPct);
    const [inv] = await db.insert(s.salesInvoices).values({ number: `S-2026-${String(++sn).padStart(4, '0')}`, partyId: party, branchId: br[b].id, date: day(d), subtotal: String(total), discount: '0', total: String(total), paid: String(paid) }).returning();
    for (const x of items) { await db.insert(s.saleItems).values({ invoiceId: inv.id, productId: x.p.id, description: x.p.name, qty: String(x.q), unitPrice: x.p.salePrice, unitCost: x.p.avgCost }); const k = x.p.id + '-' + br[b].id; stock.set(k, stock.get(k)! - x.q); await db.insert(s.stockMovements).values({ productId: x.p.id, branchId: br[b].id, qty: String(-x.q), type: 'sale', ref: inv.number, unitCost: x.p.avgCost }); }
    if (paid > 0) await db.insert(s.payments).values({ date: day(d), partyId: party, treasuryId: tr[tre].id, direction: 'in', amount: String(paid), salesInvoiceId: inv.id, note: `دفعة ${inv.number}` });
  };
  await sale(0, pa[0].id, 40, [[0, 2], [1, 4]], 0.5, 0); await sale(0, pa[1].id, 33, [[2, 1], [3, 20]], 1, 0); await sale(1, pa[2].id, 25, [[4, 10], [5, 30]], 0.3, 1);
  await sale(2, pa[0].id, 18, [[6, 3], [7, 150]], 0.4, 2); await sale(0, null, 8, [[3, 5], [4, 3]], 1, 0); await sale(1, pa[1].id, 3, [[8, 60], [7, 80]], 0, 1);
  for (const [k, q] of stock) { const [pid, bid] = k.split('-').map(Number); await db.insert(s.stock).values({ productId: pid, branchId: bid, qty: String(q) }); const op = pr.find((p) => p.id === pid)!; await db.insert(s.stockMovements).values({ productId: pid, branchId: bid, qty: String(op.unit === 'طن' ? 12 : op.unit === 'متر' ? 600 : 40), type: 'opening', unitCost: op.avgCost }); }
  await db.insert(s.expenses).values([{ date: day(20), branchId: br[0].id, category: 'إيجار', amount: '40000', treasuryId: tr[0].id, note: 'إيجار المخزن' }, { date: day(10), branchId: br[1].id, category: 'رواتب', amount: '90000', treasuryId: tr[1].id }] as never).catch(() => {});
  const as = await db.insert(s.assets).values([
    { code: 'AS-001', name: 'رافعة شوكية', branchId: br[0].id, purchaseDate: day(400), purchaseCost: '36500', lifeYears: 10, salvageValue: '3650', dailyRate: '250', status: 'running', barcode: '700001' },
    { code: 'AS-002', name: 'خلاطة خرسانة', branchId: br[0].id, purchaseDate: day(200), purchaseCost: '18250', lifeYears: 5, salvageValue: '0', dailyRate: '150', status: 'rented', barcode: '700002' },
    { code: 'AS-003', name: 'ماكينة قص هيدروليكية', branchId: br[2].id, purchaseDate: day(700), purchaseCost: '90000', lifeYears: 8, salvageValue: '9000', status: 'maintenance' }]).returning();
  await db.insert(s.rentals).values({ number: 'RN-2026-0001', assetId: as[1].id, partyId: pa[0].id, branchId: br[0].id, startDate: day(12), expectedEnd: day(2), dailyRate: '150', deposit: '500', siteNote: 'موقع بناء - بورسودان' });
  await db.insert(s.workOrders).values({ number: 'WO-2026-0001', assetId: as[2].id, branchId: br[2].id, type: 'corrective', priority: 'high', title: 'تسريب زيت هيدروليكي', status: 'open' });
  await db.insert(s.maintenancePlans).values({ assetId: as[0].id, title: 'تغيير زيت وفحص عام', intervalDays: 90, lastDone: day(80), nextDue: day(-10) });
  await db.insert(s.cheques).values({ number: 'CH-2041', direction: 'in', partyId: pa[0].id, branchId: br[0].id, bank: 'بنك الخرطوم', amount: '20000', dueDate: day(-3) });
  console.log('تم. المستخدمان: demo (مدير) و portsudan (موظف فرع). كلمة المرور:', pass); process.exit(0);
}
main();

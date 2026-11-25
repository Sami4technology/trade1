import { sql } from 'drizzle-orm';
import { db, schema as s } from './index';
async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.branches);
  if (n > 0) { console.log('البيانات موجودة، تم التخطي'); process.exit(0); }
  const br = await db.insert(s.branches).values([{ name: 'بورسودان' }, { name: 'الخرطوم' }]).returning();
  const cat = await db.insert(s.categories).values([
    { name: 'معدات ورش', kind: 'equipment' }, { name: 'معدات مصانع', kind: 'equipment' }, { name: 'أدوات سلامة', kind: 'safety' },
    { name: 'حديد تسليح وقطاعات', kind: 'iron' }, { name: 'مواد صيانة جملونات', kind: 'material' }]).returning();
  await db.insert(s.treasury).values([{ name: 'خزينة بورسودان', branchId: br[0].id, type: 'cash', openingBalance: '0' }, { name: 'خزينة الخرطوم', branchId: br[1].id, type: 'cash', openingBalance: '0' }, { name: 'الحساب البنكي', type: 'bank', openingBalance: '0' }]);
  await db.insert(s.parties).values([{ name: 'مورد تجريبي', type: 'supplier' }, { name: 'عميل تجريبي', type: 'customer' }]);
  const pr = await db.insert(s.products).values([
    { code: 'EQ-001', name: 'ماكينة لحام', categoryId: cat[0].id, salePrice: '1500', avgCost: '1000', minQty: '2' },
    { code: 'EQ-002', name: 'جلاخة 9 بوصة', categoryId: cat[0].id, salePrice: '300', avgCost: '200', minQty: '5' },
    { code: 'SF-001', name: 'خوذة سلامة', categoryId: cat[2].id, salePrice: '25', avgCost: '15', minQty: '20' },
    { code: 'SF-002', name: 'حذاء سلامة', categoryId: cat[2].id, salePrice: '60', avgCost: '40', minQty: '10' },
    { code: 'IR-001', name: 'حديد تسليح 12 مم', categoryId: cat[3].id, unit: 'طن', salePrice: '900', avgCost: '750', minQty: '5' },
    { code: 'IR-002', name: 'زاوية حديد 50 مم', categoryId: cat[3].id, unit: 'متر', salePrice: '12', avgCost: '8', minQty: '100' },
    { code: 'MT-001', name: 'ألواح زنك للأسقف', categoryId: cat[4].id, unit: 'لوح', salePrice: '30', avgCost: '20', minQty: '50' }]).returning();
  for (const p of pr) for (const b of br) {
    const q = p.unit === 'طن' ? 10 : p.unit === 'متر' ? 500 : 30;
    await db.insert(s.stock).values({ productId: p.id, branchId: b.id, qty: String(q) });
    await db.insert(s.stockMovements).values({ productId: p.id, branchId: b.id, qty: String(q), type: 'opening', unitCost: p.avgCost });
  }
  console.log('تمت إضافة بيانات تجريبية'); process.exit(0);
}
main();

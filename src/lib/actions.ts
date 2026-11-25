'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { signSession } from './auth';
import { getSession } from './session';
import { audit } from './audit';
import { checkPassword, hashPassword } from './password';
import { moveStock, receiveWithAvg } from './stock';

const str = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : v; };
const req = (f: FormData, k: string) => { const v = str(f, k); if (!v) throw new Error(`الحقل مطلوب: ${k}`); return v; };
const num = (f: FormData, k: string, d = 0) => { const v = str(f, k); return v === null || isNaN(Number(v)) ? d : Number(v); };
const int = (f: FormData, k: string) => { const v = str(f, k); return v ? parseInt(v, 10) : null; };
const reqInt = (f: FormData, k: string) => { const v = int(f, k); if (!v) throw new Error(`الحقل مطلوب: ${k}`); return v; };
const today = () => new Date().toISOString().slice(0, 10);
type Line = { productId: number; qty: number; price: number };
const r2 = (x: number) => Math.round(x * 100) / 100;
function fx(f: FormData) { const cur = str(f, 'currency') === 'USD' ? 'USD' : 'SDG'; const rate = cur === 'USD' ? num(f, 'fxRate') : 1; if (rate <= 0) throw new Error('سعر الصرف غير صحيح'); return { cur, rate }; }
function lines(f: FormData): Line[] {
  const arr = JSON.parse(String(f.get('items') ?? '[]')) as Line[];
  const out = arr.filter((l) => l.productId && l.qty > 0 && l.price >= 0);
  if (!out.length) throw new Error('أضف صنفاً واحداً على الأقل');
  return out;
}
async function nextNo(prefix: string, table: 'sales' | 'purchases' | 'transfers' | 'jobs' | 'wo' | 'returns' | 'rentals' | 'quotes' | 'stocktakes') {
  const t = { sales: s.salesInvoices, purchases: s.purchaseInvoices, transfers: s.transfers, jobs: s.jobs, wo: s.workOrders, returns: s.returns, rentals: s.rentals, quotes: s.quotes, stocktakes: s.stocktakes }[table];
  const [r] = await db.select({ m: sql<number>`coalesce(max(${t.id}),0)` }).from(t);
  return `${prefix}-${new Date().getFullYear()}-${String(Number(r.m) + 1).padStart(4, '0')}`;
}

export async function login(f: FormData) {
  const username = String(f.get('username') ?? '').trim().toLowerCase(), password = String(f.get('password') ?? '');
  let [u] = await db.select().from(s.users).where(eq(s.users.username, username));
  if (!u) { // first-run bootstrap: admin / ADMIN_PASSWORD
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
    if (n === 0 && username === 'admin' && password === (process.env.ADMIN_PASSWORD ?? '') && password) {
      [u] = await db.insert(s.users).values({ username: 'admin', name: 'المدير', passwordHash: hashPassword(password), role: 'admin' }).returning();
    }
  }
  if (!u || !u.active || !checkPassword(password, u.passwordHash)) { await audit('محاولة دخول فاشلة', 'users', username, '', db, { uid: 0, name: '—' }); redirect('/login?e=1'); }
  await audit('تسجيل دخول', 'users', u.username, '', db, { uid: u.id, name: u.name });
  (await cookies()).set('eq_session', await signSession({ uid: u.id, role: u.role as 'admin' | 'branch', branchId: u.branchId }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14, secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIE !== '1' });
  redirect('/');
}
export async function logout() { (await cookies()).delete('eq_session'); redirect('/login'); }
export async function setBranch(f: FormData) { const se = await getSession(); if (se?.role !== 'admin') return; (await cookies()).set('branch', String(f.get('branch') ?? 'all'), { path: '/', maxAge: 60 * 60 * 24 * 365 }); revalidatePath('/', 'layout'); }
async function mine(branchId: number) { const se = await getSession(); if (se?.role === 'branch' && se.branchId !== branchId) throw new Error('هذه البيانات تتبع فرعاً آخر'); }
async function treasuryOk(id: number | null) {
  if (!id) return; const se = await getSession(); if (se?.role !== 'branch') return;
  const [tr] = await db.select().from(s.treasury).where(eq(s.treasury.id, id)); if (tr?.branchId && tr.branchId !== se.branchId) throw new Error('هذه الخزينة تتبع فرعاً آخر');
}
async function jobGuard(id: number) { const [j] = await db.select().from(s.jobs).where(eq(s.jobs.id, id)); if (j) await mine(j.branchId); }
async function adminOnly() { const se = await getSession(); if (se?.role !== 'admin') throw new Error('هذه العملية للمدير فقط'); return se; }
async function bid(f: FormData, k = 'branchId') { const v = reqInt(f, k); const se = await getSession(); return se?.role === 'branch' && se.branchId ? se.branchId : v; }
export async function createUser(f: FormData) {
  await adminOnly(); const role = req(f, 'role'); const pw = req(f, 'password'); if (pw.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');
  if (role === 'branch' && !int(f, 'branchId')) throw new Error('اختر فرع المستخدم');
  await db.insert(s.users).values({ username: req(f, 'username').toLowerCase(), name: req(f, 'name'), passwordHash: hashPassword(pw), role, branchId: role === 'branch' ? int(f, 'branchId') : null });
  await audit('إضافة مستخدم', 'users', req(f, 'username'), req(f, 'role'));
  revalidatePath('/users');
}
export async function resetPassword(f: FormData) {
  await adminOnly(); const pw = req(f, 'password'); if (pw.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');
  await db.update(s.users).set({ passwordHash: hashPassword(pw) }).where(eq(s.users.id, reqInt(f, 'id'))); await audit('تغيير كلمة مرور', 'users', String(reqInt(f, 'id')));
  revalidatePath('/users');
}
export async function toggleUser(f: FormData) {
  const se = await adminOnly(); const id = reqInt(f, 'id'); if (id === se.uid) throw new Error('لا يمكنك إيقاف حسابك');
  await db.update(s.users).set({ active: f.get('active') === '1' }).where(eq(s.users.id, id)); await audit(f.get('active') === '1' ? 'تفعيل مستخدم' : 'إيقاف مستخدم', 'users', String(id));
  revalidatePath('/users');
}
export async function saveCompany(f: FormData) {
  await adminOnly();
  for (const k of ['company_name', 'company_phone', 'company_address', 'company_footer']) await db.insert(s.settings).values({ key: k, value: String(f.get(k) ?? '') }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(f.get(k) ?? '') } });
  revalidatePath('/settings');
}

/* settings */
export async function createBranch(f: FormData) { await adminOnly(); await db.insert(s.branches).values({ name: req(f, 'name'), kind: str(f, 'kind') ?? 'branch' }); revalidatePath('/settings'); }
export async function createCategory(f: FormData) { await adminOnly(); await db.insert(s.categories).values({ name: req(f, 'name'), kind: req(f, 'kind') }); revalidatePath('/settings'); }
export async function createTreasury(f: FormData) { await adminOnly(); await db.insert(s.treasury).values({ name: req(f, 'name'), branchId: int(f, 'branchId'), type: req(f, 'type'), openingBalance: String(num(f, 'openingBalance')) }); revalidatePath('/settings'); }

/* products & parties */
async function currentRate() { const [r] = await db.select().from(s.settings).where(eq(s.settings.key, 'usd_rate')); return Number(r?.value ?? 0); }
function priceFrom(f: FormData, rate: number) { const usd = num(f, 'usdPrice'); return { usd, sale: usd > 0 && rate > 0 ? Math.round(usd * rate) : num(f, 'salePrice') }; }
export async function createProduct(f: FormData) {
  const { usd, sale } = priceFrom(f, await currentRate());
  await db.insert(s.products).values({ code: req(f, 'code'), name: req(f, 'name'), categoryId: int(f, 'categoryId'), unit: str(f, 'unit') ?? 'قطعة', salePrice: String(sale), usdPrice: String(usd), avgCost: String(num(f, 'avgCost')), minQty: String(num(f, 'minQty')), barcode: str(f, 'barcode') });
  await audit('إضافة صنف', 'products', req(f, 'code'), req(f, 'name'));
  revalidatePath('/products'); redirect('/products');
}
export async function editProduct(f: FormData) {
  await adminOnly(); const id = reqInt(f, 'id'); const { usd, sale } = priceFrom(f, await currentRate());
  await db.update(s.products).set({ name: req(f, 'name'), categoryId: int(f, 'categoryId'), unit: str(f, 'unit') ?? 'قطعة', salePrice: String(sale), usdPrice: String(usd), minQty: String(num(f, 'minQty')), barcode: str(f, 'barcode'), active: f.get('active') === '1' }).where(eq(s.products.id, id));
  await audit('تعديل صنف', 'products', String(id), `سعر البيع ${sale}${usd ? ` (${usd}$)` : ''}`);
  revalidatePath('/products'); redirect('/products');
}
export async function updateRate(f: FormData) {
  await adminOnly(); const rate = num(f, 'rate'); if (rate <= 0) throw new Error('سعر الصرف غير صحيح');
  const se = await getSession(); const [u] = se ? await db.select({ n: s.users.name }).from(s.users).where(eq(s.users.id, se.uid)) : [];
  const upd = await db.update(s.products).set({ salePrice: sql`round(${s.products.usdPrice} * ${rate})` }).where(sql`${s.products.usdPrice} > 0`).returning({ id: s.products.id });
  await db.insert(s.rates).values({ rate: String(rate), userName: u?.n ?? null, updated: upd.length });
  await db.insert(s.settings).values({ key: 'usd_rate', value: String(rate) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(rate) } });
  await audit('تحديث سعر الصرف', 'rates', String(rate), `تحديث أسعار ${upd.length} صنف`);
  revalidatePath('/settings'); revalidatePath('/products');
}
export async function createParty(f: FormData) {
  await db.insert(s.parties).values({ name: req(f, 'name'), type: req(f, 'type'), phone: str(f, 'phone'), address: str(f, 'address'), openingBalance: String(num(f, 'openingBalance')) });
  await audit('إضافة عميل/مورد', 'parties', req(f, 'name'), req(f, 'type'));
  revalidatePath('/parties'); redirect(`/parties?type=${req(f, 'type')}`);
}

async function addPayment(tx: typeof db, o: { partyId: number | null; treasuryId: number; direction: 'in' | 'out'; amount: number; saleId?: number; purchaseId?: number; note?: string | null; date?: string }) {
  await tx.insert(s.payments).values({ date: o.date ?? today(), partyId: o.partyId, treasuryId: o.treasuryId, direction: o.direction, amount: String(o.amount), salesInvoiceId: o.saleId, purchaseInvoiceId: o.purchaseId, note: o.note ?? null });
}

/* sales */
export async function createSale(f: FormData) {
  const { cur, rate } = fx(f); const items = lines(f).map((l) => ({ ...l, price: r2(l.price * rate) })); const branchId = await bid(f); const partyId = int(f, 'partyId');
  const discount = r2(num(f, 'discount') * rate); let paid = r2(num(f, 'paid') * rate); const treasuryId = int(f, 'treasuryId'); await treasuryOk(treasuryId);
  const number = await nextNo('S', 'sales');
  const id = await db.transaction(async (tx) => {
    const subtotal = items.reduce((a, l) => a + l.qty * l.price, 0);
    const total = Math.max(subtotal - discount, 0);
    if (paid > total + 0.05) throw new Error('المدفوع أكبر من إجمالي الفاتورة'); if (paid > total) paid = total;
    if (paid < total && !partyId) throw new Error('البيع الآجل يتطلب اختيار عميل');
    if (paid > 0 && !treasuryId) throw new Error('اختر الخزينة/الحساب لاستلام المبلغ');
    const [inv] = await tx.insert(s.salesInvoices).values({ number, partyId, branchId, date: str(f, 'date') ?? today(), subtotal: String(subtotal), discount: String(discount), total: String(total), paid: String(paid), currency: cur, fxRate: String(rate), note: str(f, 'note') }).returning();
    for (const l of items) {
      const [p] = await tx.select().from(s.products).where(eq(s.products.id, l.productId));
      await tx.insert(s.saleItems).values({ invoiceId: inv.id, productId: p.id, description: p.name, qty: String(l.qty), unitPrice: String(l.price), unitCost: p.avgCost });
      await moveStock(tx, { productId: p.id, branchId, qty: -l.qty, type: 'sale', ref: number, unitCost: Number(p.avgCost) });
    }
    if (paid > 0) await addPayment(tx as unknown as typeof db, { partyId, treasuryId: treasuryId!, direction: 'in', amount: paid, saleId: inv.id, note: `دفعة فاتورة ${number}` });
    return inv.id;
  });
  await audit('إنشاء فاتورة بيع', 'sales', number, `الفرع ${branchId} · ${items.length} أصناف`);
  revalidatePath('/sales'); revalidatePath('/stock'); revalidatePath('/'); redirect(`/sales/${id}`);
}
export async function cancelSale(f: FormData) {
  const id = reqInt(f, 'id');
  await db.transaction(async (tx) => {
    const [inv] = await tx.select().from(s.salesInvoices).where(and(eq(s.salesInvoices.id, id), eq(s.salesInvoices.status, 'active')));
    if (!inv) return; await mine(inv.branchId);
    if (Number(inv.paid) > 0 || Number(inv.returned) > 0) throw new Error('لا يمكن إلغاء فاتورة عليها مدفوعات أو مرتجعات. استخدم مرتجع مبيعات.');
    if (inv.jobId) throw new Error('فاتورة مرتبطة بأمر خدمة');
    const items = await tx.select().from(s.saleItems).where(eq(s.saleItems.invoiceId, id));
    for (const it of items) if (it.productId) await moveStock(tx, { productId: it.productId, branchId: inv.branchId, qty: Number(it.qty), type: 'sale_cancel', ref: inv.number, unitCost: Number(it.unitCost) });
    await tx.update(s.salesInvoices).set({ status: 'cancelled' }).where(eq(s.salesInvoices.id, id));
    await audit('إلغاء فاتورة بيع', 'sales', inv.number, '', tx);
  });
  revalidatePath(`/sales/${id}`); revalidatePath('/sales'); revalidatePath('/stock');
}

/* purchases */
export async function createPurchase(f: FormData) {
  const { cur, rate } = fx(f); const items = lines(f).map((l) => ({ ...l, price: r2(l.price * rate) })); const branchId = await bid(f); const partyId = reqInt(f, 'partyId');
  let paid = r2(num(f, 'paid') * rate); const treasuryId = int(f, 'treasuryId'); await treasuryOk(treasuryId);
  const extras: { label: string; amount: number }[] = [];
  for (let i = 1; i <= 4; i++) { const a = num(f, `extra_amount_${i}`); if (a > 0) extras.push({ label: str(f, `extra_label_${i}`) ?? 'مصاريف استيراد', amount: a }); }
  const extraTotal = extras.reduce((x, e) => x + e.amount, 0); const extraTreasury = int(f, 'extraTreasuryId'); await treasuryOk(extraTreasury);
  if (extraTotal > 0 && !extraTreasury) throw new Error('اختر الخزينة التي تُدفع منها مصاريف الاستيراد');
  const number = await nextNo('P', 'purchases');
  const id = await db.transaction(async (tx) => {
    const total = items.reduce((a, l) => a + l.qty * l.price, 0); const sumQty = items.reduce((a, l) => a + l.qty, 0);
    if (paid > total + 0.05) throw new Error('المدفوع أكبر من إجمالي الفاتورة'); if (paid > total) paid = total;
    if (paid > 0 && !treasuryId) throw new Error('اختر الخزينة/الحساب للدفع');
    const [inv] = await tx.insert(s.purchaseInvoices).values({ number, partyId, branchId, date: str(f, 'date') ?? today(), total: String(total), extraCosts: String(extraTotal), paid: String(paid), currency: cur, fxRate: String(rate), supplierRef: str(f, 'supplierRef'), note: str(f, 'note') }).returning();
    for (const l of items) {
      const share = total > 0 ? (extraTotal * (l.qty * l.price)) / total : (extraTotal * l.qty) / sumQty; // توزيع المصاريف بنسبة القيمة
      const landed = l.price + share / l.qty;
      await tx.insert(s.purchaseItems).values({ invoiceId: inv.id, productId: l.productId, qty: String(l.qty), unitCost: String(l.price), landedUnitCost: landed.toFixed(2) });
      await receiveWithAvg(tx, { productId: l.productId, branchId, qty: l.qty, unitCost: landed, ref: number });
    }
    for (const e of extras) await tx.insert(s.purchaseCosts).values({ invoiceId: inv.id, label: e.label, amount: String(e.amount) });
    if (extraTotal > 0) await addPayment(tx as unknown as typeof db, { partyId: null, treasuryId: extraTreasury!, direction: 'out', amount: extraTotal, note: `مصاريف استيراد فاتورة ${number}` });
    if (paid > 0) await addPayment(tx as unknown as typeof db, { partyId, treasuryId: treasuryId!, direction: 'out', amount: paid, purchaseId: inv.id, note: `دفعة فاتورة ${number}` });
    return inv.id;
  });
  await audit('إنشاء فاتورة شراء', 'purchases', number, `الفرع ${branchId} · ${items.length} أصناف${extraTotal ? ` · مصاريف استيراد ${extraTotal}` : ''}`);
  revalidatePath('/purchases'); revalidatePath('/stock'); revalidatePath('/accounts'); revalidatePath('/'); redirect(`/purchases/${id}`);
}
export async function cancelPurchase(f: FormData) {
  const id = reqInt(f, 'id');
  await db.transaction(async (tx) => {
    const [inv] = await tx.select().from(s.purchaseInvoices).where(and(eq(s.purchaseInvoices.id, id), eq(s.purchaseInvoices.status, 'active')));
    if (!inv) return; await mine(inv.branchId);
    if (Number(inv.paid) > 0 || Number(inv.returned) > 0) throw new Error('لا يمكن إلغاء فاتورة عليها مدفوعات أو مرتجعات. استخدم مرتجع مشتريات.');
    const items = await tx.select().from(s.purchaseItems).where(eq(s.purchaseItems.invoiceId, id));
    for (const it of items) await moveStock(tx, { productId: it.productId, branchId: inv.branchId, qty: -Number(it.qty), type: 'purchase_cancel', ref: inv.number, unitCost: Number(it.unitCost) });
    await tx.update(s.purchaseInvoices).set({ status: 'cancelled' }).where(eq(s.purchaseInvoices.id, id));
    await audit('إلغاء فاتورة شراء', 'purchases', inv.number, '', tx);
  });
  revalidatePath(`/purchases/${id}`); revalidatePath('/purchases'); revalidatePath('/stock');
}

/* vouchers */
export async function createVoucher(f: FormData) {
  const direction = req(f, 'direction') as 'in' | 'out'; const amount = num(f, 'amount');
  if (amount <= 0) throw new Error('المبلغ غير صحيح');
  const partyId = int(f, 'partyId'); const saleId = direction === 'in' ? int(f, 'invoiceId') : null; const purchaseId = direction === 'out' ? int(f, 'invoiceId') : null;
  await treasuryOk(reqInt(f, 'treasuryId'));
  if (saleId) { const [i] = await db.select().from(s.salesInvoices).where(eq(s.salesInvoices.id, saleId)); if (i) await mine(i.branchId); }
  if (purchaseId) { const [i] = await db.select().from(s.purchaseInvoices).where(eq(s.purchaseInvoices.id, purchaseId)); if (i) await mine(i.branchId); }
  await db.transaction(async (tx) => {
    if (saleId) { const [r] = await tx.update(s.salesInvoices).set({ paid: sql`${s.salesInvoices.paid} + ${amount}` }).where(and(eq(s.salesInvoices.id, saleId), sql`${s.salesInvoices.paid} + ${amount} <= ${s.salesInvoices.total} - ${s.salesInvoices.returned}`, eq(s.salesInvoices.status, 'active'))).returning(); if (!r) throw new Error('المبلغ أكبر من المتبقي على الفاتورة'); }
    if (purchaseId) { const [r] = await tx.update(s.purchaseInvoices).set({ paid: sql`${s.purchaseInvoices.paid} + ${amount}` }).where(and(eq(s.purchaseInvoices.id, purchaseId), sql`${s.purchaseInvoices.paid} + ${amount} <= ${s.purchaseInvoices.total} - ${s.purchaseInvoices.returned}`, eq(s.purchaseInvoices.status, 'active'))).returning(); if (!r) throw new Error('المبلغ أكبر من المتبقي على الفاتورة'); }
    await addPayment(tx as unknown as typeof db, { partyId, treasuryId: reqInt(f, 'treasuryId'), direction, amount, saleId: saleId ?? undefined, purchaseId: purchaseId ?? undefined, note: str(f, 'note'), date: str(f, 'date') ?? today() });
  });
  await audit(direction === 'in' ? 'سند قبض' : 'سند صرف', 'payments', String(amount), str(f, 'note') ?? '');
  revalidatePath('/accounts'); revalidatePath('/parties'); revalidatePath('/sales'); revalidatePath('/purchases'); revalidatePath('/'); redirect(str(f, 'back') ?? '/accounts');
}
export async function createExpense(f: FormData) {
  const amount = num(f, 'amount'); if (amount <= 0) throw new Error('المبلغ غير صحيح'); await treasuryOk(int(f, 'treasuryId'));
  await db.insert(s.expenses).values({ date: str(f, 'date') ?? today(), branchId: await bid(f), treasuryId: reqInt(f, 'treasuryId'), category: req(f, 'category'), amount: String(amount), note: str(f, 'note') });
  await audit('تسجيل مصروف', 'expenses', String(amount), `${req(f, 'category')}`);
  revalidatePath('/expenses'); revalidatePath('/accounts'); revalidatePath('/');
}

/* inventory */
export async function createTransfer(f: FormData) {
  const items = lines(f); const from = await bid(f, 'fromBranchId'); const to = reqInt(f, 'toBranchId');
  if (from === to) throw new Error('الفرعان متطابقان'); const number = await nextNo('T', 'transfers');
  const id = await db.transaction(async (tx) => {
    const [t] = await tx.insert(s.transfers).values({ number, fromBranchId: from, toBranchId: to, date: str(f, 'date') ?? today(), note: str(f, 'note') }).returning();
    for (const l of items) {
      await tx.insert(s.transferItems).values({ transferId: t.id, productId: l.productId, qty: String(l.qty) });
      await moveStock(tx, { productId: l.productId, branchId: from, qty: -l.qty, type: 'transfer_out', ref: number });
      await moveStock(tx, { productId: l.productId, branchId: to, qty: l.qty, type: 'transfer_in', ref: number });
    }
    return t.id;
  });
  await audit('تحويل مخزني', 'transfers', number, `من ${from} إلى ${to}`);
  revalidatePath('/stock'); redirect('/stock/transfers?ok=' + id);
}
export async function adjustStock(f: FormData) {
  const productId = reqInt(f, 'productId'), branchId = await bid(f), delta = num(f, 'delta');
  if (!delta) return;
  await db.transaction((tx) => moveStock(tx, { productId, branchId, qty: delta, type: 'adjust', note: str(f, 'note') }));
  await audit('تسوية مخزون', 'stock', `منتج ${productId} / فرع ${branchId}`, `${delta > 0 ? '+' : ''}${delta} ${str(f, 'note') ?? ''}`);
  revalidatePath('/stock');
}

/* service jobs */
export async function createJob(f: FormData) {
  const [j] = await db.insert(s.jobs).values({ number: await nextNo('J', 'jobs'), partyId: reqInt(f, 'partyId'), branchId: await bid(f), kind: req(f, 'kind'), title: req(f, 'title'), siteAddress: str(f, 'siteAddress'), quoteAmount: String(num(f, 'quoteAmount')), startDate: str(f, 'startDate'), notes: str(f, 'notes') }).returning({ id: s.jobs.id, number: s.jobs.number });
  await audit('إنشاء أمر خدمة', 'service_jobs', j.number);
  revalidatePath('/jobs'); redirect(`/jobs/${j.id}`);
}
export async function setJobStatus(f: FormData) {
  const id = reqInt(f, 'id'); const status = req(f, 'status'); await jobGuard(id);
  await db.update(s.jobs).set({ status, ...(status === 'done' ? { endDate: today() } : {}) }).where(and(eq(s.jobs.id, id), sql`${s.jobs.status} <> 'invoiced'`));
  await audit('تغيير حالة أمر خدمة', 'service_jobs', String(id), status);
  revalidatePath(`/jobs/${id}`); revalidatePath('/jobs');
}
export async function updateJobFinance(f: FormData) {
  const id = reqInt(f, 'id'); await jobGuard(id);
  await db.update(s.jobs).set({ quoteAmount: String(num(f, 'quoteAmount')), laborCost: String(num(f, 'laborCost')) }).where(and(eq(s.jobs.id, id), sql`${s.jobs.status} <> 'invoiced'`));
  await db.update(s.jobMilestones).set({ amount: sql`round(${num(f, 'quoteAmount')} * ${s.jobMilestones.percent} / 100, 2)` }).where(and(eq(s.jobMilestones.jobId, id), sql`${s.jobMilestones.invoiceId} is null`));
  revalidatePath(`/jobs/${id}`);
}
export async function addJobMaterial(f: FormData) {
  const jobId = reqInt(f, 'jobId'), productId = reqInt(f, 'productId'), q = num(f, 'qty');
  if (q <= 0) throw new Error('الكمية غير صحيحة');
  await db.transaction(async (tx) => {
    const [j] = await tx.select().from(s.jobs).where(eq(s.jobs.id, jobId));
    if (!j || j.status === 'invoiced' || j.status === 'cancelled') throw new Error('لا يمكن تعديل هذا الأمر'); await mine(j.branchId);
    const [p] = await tx.select().from(s.products).where(eq(s.products.id, productId));
    await moveStock(tx, { productId, branchId: j.branchId, qty: -q, type: 'job', ref: j.number, unitCost: Number(p.avgCost) });
    await tx.insert(s.jobMaterials).values({ jobId, productId, qty: String(q), unitCost: p.avgCost });
  });
  revalidatePath(`/jobs/${jobId}`); revalidatePath('/stock');
}
export async function invoiceJob(f: FormData) {
  const id = reqInt(f, 'id'); const paid = num(f, 'paid'); const treasuryId = int(f, 'treasuryId'); await jobGuard(id); await treasuryOk(treasuryId);
  const sid = await db.transaction(async (tx) => {
    const [j] = await tx.select().from(s.jobs).where(eq(s.jobs.id, id));
    if (!j || j.status !== 'done') throw new Error('الأمر يجب أن يكون «منجزاً» قبل الفوترة');
    const [{ mc }] = await tx.select({ mc: sql<number>`count(*)::int` }).from(s.jobMilestones).where(eq(s.jobMilestones.jobId, id)); if (mc > 0) throw new Error('هذا الأمر يُفوتَر بالدفعات المرحلية');
    const total = Number(j.quoteAmount); if (total <= 0) throw new Error('حدّد قيمة الأمر (عرض السعر) أولاً');
    if (paid > total) throw new Error('المدفوع أكبر من القيمة'); if (paid > 0 && !treasuryId) throw new Error('اختر الخزينة');
    const mats = await tx.select().from(s.jobMaterials).where(eq(s.jobMaterials.jobId, id));
    const cost = mats.reduce((a, m) => a + Number(m.qty) * Number(m.unitCost), 0) + Number(j.laborCost);
    const number = await nextNo('S', 'sales');
    const [inv] = await tx.insert(s.salesInvoices).values({ number, partyId: j.partyId, branchId: j.branchId, date: today(), subtotal: String(total), discount: '0', total: String(total), paid: String(paid), jobId: id, note: `أمر خدمة ${j.number}` }).returning();
    await tx.insert(s.saleItems).values({ invoiceId: inv.id, lineKind: 'job', description: `${j.title} (${j.number})`, qty: '1', unitPrice: String(total), unitCost: String(cost) });
    if (paid > 0) await addPayment(tx as unknown as typeof db, { partyId: j.partyId, treasuryId: treasuryId!, direction: 'in', amount: paid, saleId: inv.id, note: `دفعة أمر خدمة ${j.number}` });
    await tx.update(s.jobs).set({ status: 'invoiced' }).where(eq(s.jobs.id, id));
    return inv.id;
  });
  await audit('فوترة أمر خدمة', 'service_jobs', String(id), `فاتورة ${sid}`);
  revalidatePath('/jobs'); revalidatePath('/sales'); redirect(`/sales/${sid}`);
}

/* ---------- صيانة المعدات ---------- */
const addDays = (d: string, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
async function assetGuard(assetId: number) {
  const [a] = await db.select().from(s.assets).where(eq(s.assets.id, assetId)); if (!a) throw new Error('المعدة غير موجودة');
  const se = await getSession(); if (se?.role === 'branch' && se.branchId !== a.branchId) throw new Error('هذه المعدة تتبع فرعاً آخر'); return a;
}
export async function createAsset(f: FormData) {
  const [r] = await db.insert(s.assets).values({ code: req(f, 'code'), name: req(f, 'name'), branchId: await bid(f), category: str(f, 'category'), manufacturer: str(f, 'manufacturer'), model: str(f, 'model'), serial: str(f, 'serial'), purchaseDate: str(f, 'purchaseDate'), purchaseCost: String(num(f, 'purchaseCost')), dailyRate: String(num(f, 'dailyRate')), barcode: str(f, 'barcode'), lifeYears: int(f, 'lifeYears'), salvageValue: String(num(f, 'salvageValue')), criticality: str(f, 'criticality') ?? 'medium', notes: str(f, 'notes') }).returning({ id: s.assets.id });
  await audit('إضافة معدة', 'assets', req(f, 'code'), req(f, 'name'));
  revalidatePath('/assets'); redirect(`/assets/${r.id}`);
}
export async function setAssetStatus(f: FormData) { const id = reqInt(f, 'id'); await assetGuard(id); await db.update(s.assets).set({ status: req(f, 'status') }).where(eq(s.assets.id, id)); revalidatePath(`/assets/${id}`); revalidatePath('/assets'); }
export async function createTechnician(f: FormData) { await db.insert(s.technicians).values({ name: req(f, 'name'), phone: str(f, 'phone'), specialty: str(f, 'specialty'), branchId: int(f, 'branchId') }); revalidatePath('/technicians'); }
export async function createWorkOrder(f: FormData) {
  const a = await assetGuard(reqInt(f, 'assetId')); const type = req(f, 'type');
  const [row] = await db.insert(s.workOrders).values({ number: await nextNo('WO', 'wo'), assetId: a.id, branchId: a.branchId, type, priority: type === 'emergency' ? 'high' : str(f, 'priority') ?? 'medium', title: req(f, 'title'), description: str(f, 'description'), technicianId: int(f, 'technicianId') }).returning({ id: s.workOrders.id });
  if (type === 'emergency') await db.update(s.assets).set({ status: 'stopped' }).where(eq(s.assets.id, a.id));
  await audit('إنشاء أمر عمل صيانة', 'work_orders', String(row.id), `${a.code} · ${type}`);
  revalidatePath('/work-orders'); revalidatePath('/'); redirect(`/work-orders/${row.id}`);
}
async function woGuard(id: number) { const [w] = await db.select().from(s.workOrders).where(eq(s.workOrders.id, id)); if (!w) throw new Error('أمر العمل غير موجود'); await assetGuard(w.assetId); return w; }
export async function startWorkOrder(f: FormData) {
  const id = reqInt(f, 'id'); await woGuard(id);
  const [wo] = await db.update(s.workOrders).set({ status: 'in_progress', startedAt: new Date() }).where(and(eq(s.workOrders.id, id), eq(s.workOrders.status, 'open'))).returning();
  if (wo) await db.update(s.assets).set({ status: 'maintenance' }).where(eq(s.assets.id, wo.assetId));
  revalidatePath(`/work-orders/${id}`); revalidatePath('/work-orders'); revalidatePath('/');
}
export async function assignTechnician(f: FormData) { const id = reqInt(f, 'id'); await woGuard(id); await db.update(s.workOrders).set({ technicianId: int(f, 'technicianId') }).where(eq(s.workOrders.id, id)); revalidatePath(`/work-orders/${id}`); }
export async function addWorkOrderPart(f: FormData) {
  const workOrderId = reqInt(f, 'workOrderId'), productId = reqInt(f, 'productId'), q = num(f, 'qty'); if (q <= 0) throw new Error('الكمية غير صحيحة');
  const wo = await woGuard(workOrderId); if (wo.status === 'done' || wo.status === 'cancelled') throw new Error('لا يمكن تعديل أمر العمل');
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(s.products).where(eq(s.products.id, productId));
    await moveStock(tx, { productId, branchId: wo.branchId, qty: -q, type: 'workorder', ref: wo.number, unitCost: Number(p.avgCost) });
    await tx.insert(s.workOrderParts).values({ workOrderId, productId, qty: String(q), unitCost: p.avgCost });
  });
  revalidatePath(`/work-orders/${workOrderId}`); revalidatePath('/stock');
}
export async function removeWorkOrderPart(f: FormData) {
  const id = reqInt(f, 'id');
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(s.workOrderParts).where(eq(s.workOrderParts.id, id)); if (!row) return;
    const [wo] = await tx.select().from(s.workOrders).where(eq(s.workOrders.id, row.workOrderId));
    await assetGuard(wo.assetId); if (wo.status === 'done' || wo.status === 'cancelled') throw new Error('لا يمكن تعديل أمر العمل');
    await moveStock(tx, { productId: row.productId, branchId: wo.branchId, qty: Number(row.qty), type: 'workorder_return', ref: wo.number, unitCost: Number(row.unitCost) });
    await tx.delete(s.workOrderParts).where(eq(s.workOrderParts.id, id));
  });
  revalidatePath('/work-orders', 'layout'); revalidatePath('/stock');
}
async function restoreRunning(tx: typeof db, assetId: number) {
  const [{ c }] = await tx.select({ c: sql<number>`count(*)::int` }).from(s.workOrders).where(and(eq(s.workOrders.assetId, assetId), eq(s.workOrders.status, 'in_progress')));
  if (c === 0) await tx.update(s.assets).set({ status: 'running' }).where(and(eq(s.assets.id, assetId), sql`${s.assets.status} <> 'retired'`));
}
export async function completeWorkOrder(f: FormData) {
  const id = reqInt(f, 'id'); await woGuard(id);
  await db.transaction(async (tx) => {
    const [wo] = await tx.update(s.workOrders).set({ status: 'done', completedAt: new Date(), startedAt: sql`coalesce(${s.workOrders.startedAt}, now())`, laborHours: String(num(f, 'laborHours')), laborCost: String(num(f, 'laborCost')), downtimeHours: String(num(f, 'downtimeHours')), resolution: str(f, 'resolution') }).where(and(eq(s.workOrders.id, id), sql`${s.workOrders.status} in ('open','in_progress')`)).returning();
    if (!wo) return;
    if (wo.planId) { const [p] = await tx.select().from(s.maintenancePlans).where(eq(s.maintenancePlans.id, wo.planId)); if (p) await tx.update(s.maintenancePlans).set({ lastDone: today(), nextDue: addDays(today(), p.intervalDays) }).where(eq(s.maintenancePlans.id, p.id)); }
    await restoreRunning(tx as unknown as typeof db, wo.assetId);
  });
  await audit('إنجاز أمر عمل', 'work_orders', String(id));
  revalidatePath('/work-orders', 'layout'); revalidatePath('/'); revalidatePath('/plans'); revalidatePath('/assets');
}
export async function cancelWorkOrder(f: FormData) {
  const id = reqInt(f, 'id'); await woGuard(id);
  await db.transaction(async (tx) => {
    const [wo] = await tx.update(s.workOrders).set({ status: 'cancelled' }).where(and(eq(s.workOrders.id, id), sql`${s.workOrders.status} in ('open','in_progress')`)).returning(); if (!wo) return;
    const parts = await tx.select().from(s.workOrderParts).where(eq(s.workOrderParts.workOrderId, id));
    for (const p of parts) await moveStock(tx, { productId: p.productId, branchId: wo.branchId, qty: Number(p.qty), type: 'workorder_return', ref: wo.number, unitCost: Number(p.unitCost) });
    await tx.delete(s.workOrderParts).where(eq(s.workOrderParts.workOrderId, id));
    await restoreRunning(tx as unknown as typeof db, wo.assetId);
  });
  await audit('إلغاء أمر عمل', 'work_orders', String(id));
  revalidatePath('/work-orders', 'layout'); revalidatePath('/'); revalidatePath('/stock');
}
export async function createPlan(f: FormData) {
  await assetGuard(reqInt(f, 'assetId')); const interval = Math.max(1, num(f, 'intervalDays', 30));
  await db.insert(s.maintenancePlans).values({ assetId: reqInt(f, 'assetId'), title: req(f, 'title'), intervalDays: interval, nextDue: str(f, 'nextDue') ?? addDays(today(), interval) });
  revalidatePath('/plans'); redirect('/plans');
}
export async function togglePlan(f: FormData) { const id = reqInt(f, 'id'); const [p] = await db.select().from(s.maintenancePlans).where(eq(s.maintenancePlans.id, id)); if (p) await assetGuard(p.assetId); await db.update(s.maintenancePlans).set({ active: f.get('active') === '1' }).where(eq(s.maintenancePlans.id, id)); revalidatePath('/plans'); }
export async function generatePlanWorkOrder(f: FormData) {
  const id = reqInt(f, 'id'); const [p] = await db.select().from(s.maintenancePlans).where(eq(s.maintenancePlans.id, id)); if (!p) return;
  const a = await assetGuard(p.assetId);
  const open = await db.select({ id: s.workOrders.id }).from(s.workOrders).where(and(eq(s.workOrders.planId, id), sql`${s.workOrders.status} in ('open','in_progress')`));
  if (open.length) redirect(`/work-orders/${open[0].id}`);
  const [row] = await db.insert(s.workOrders).values({ number: await nextNo('WO', 'wo'), assetId: a.id, branchId: a.branchId, planId: id, type: 'preventive', priority: 'medium', title: p.title }).returning({ id: s.workOrders.id });
  revalidatePath('/work-orders'); revalidatePath('/plans'); redirect(`/work-orders/${row.id}`);
}

/* ---------- المرتجعات ---------- */
export async function createReturn(f: FormData) {
  const type = req(f, 'type') as 'sale' | 'purchase'; const invId = reqInt(f, 'invoiceId'); const refund = num(f, 'refund'); const treasuryId = int(f, 'treasuryId');
  await treasuryOk(treasuryId); const number = await nextNo('R', 'returns');
  await db.transaction(async (tx) => {
    const sale = type === 'sale';
    const [inv] = sale ? await tx.select().from(s.salesInvoices).where(and(eq(s.salesInvoices.id, invId), eq(s.salesInvoices.status, 'active'))) : await tx.select().from(s.purchaseInvoices).where(and(eq(s.purchaseInvoices.id, invId), eq(s.purchaseInvoices.status, 'active')));
    if (!inv) throw new Error('الفاتورة غير موجودة أو ملغاة'); await mine(inv.branchId);
    const src = sale
      ? await tx.select({ id: s.saleItems.id, productId: s.saleItems.productId, qty: s.saleItems.qty, price: s.saleItems.unitPrice, cost: s.saleItems.unitCost }).from(s.saleItems).where(eq(s.saleItems.invoiceId, invId))
      : await tx.select({ id: s.purchaseItems.id, productId: s.purchaseItems.productId, qty: s.purchaseItems.qty, price: s.purchaseItems.unitCost, cost: s.purchaseItems.unitCost }).from(s.purchaseItems).where(eq(s.purchaseItems.invoiceId, invId));
    const prev = await tx.execute(sql`select ri.product_id, sum(ri.qty)::float as q from return_items ri join returns r on r.id=ri.return_id where ${sale ? sql`r.sales_invoice_id=${invId}` : sql`r.purchase_invoice_id=${invId}`} group by 1`);
    const remain = new Map<number, number>();
    for (const it of src) if (it.productId) remain.set(it.productId, (remain.get(it.productId) ?? 0) + Number(it.qty));
    for (const r of prev.rows as { product_id: number; q: number }[]) remain.set(Number(r.product_id), (remain.get(Number(r.product_id)) ?? 0) - Number(r.q));
    const factor = sale && Number((inv as { subtotal: string }).subtotal) > 0 ? Number(inv.total) / Number((inv as { subtotal: string }).subtotal) : 1; // يوزّع الخصم
    const lines: { productId: number; qty: number; price: number; cost: number }[] = []; let total = 0;
    for (const it of src) {
      const q = num(f, `qty_${it.id}`); if (q <= 0 || !it.productId) continue;
      const rem = remain.get(it.productId) ?? 0; if (q > rem + 1e-9) throw new Error('كمية المرتجع أكبر من المتاح للإرجاع');
      remain.set(it.productId, rem - q); const price = Number(it.price) * factor; lines.push({ productId: it.productId, qty: q, price, cost: Number(it.cost) }); total += q * price;
    }
    if (!lines.length) throw new Error('حدد كمية مرتجعة لصنف واحد على الأقل');
    const newReturned = Number(inv.returned) + total; if (newReturned > Number(inv.total) + 0.01) throw new Error('المرتجع يتجاوز قيمة الفاتورة');
    const excess = Number(inv.paid) - (Number(inv.total) - newReturned);
    if (refund > Math.max(excess, 0) + 0.01) throw new Error('مبلغ الرد أكبر من المبلغ المدفوع الزائد عن قيمة الفاتورة بعد المرتجع');
    if (refund > 0 && !treasuryId) throw new Error('اختر الخزينة لرد المبلغ');
    const [ret] = await tx.insert(s.returns).values({ number, type, salesInvoiceId: sale ? invId : null, purchaseInvoiceId: sale ? null : invId, partyId: inv.partyId ?? null, branchId: inv.branchId, date: str(f, 'date') ?? today(), total: String(total), refund: String(refund), note: str(f, 'note') }).returning();
    for (const l of lines) {
      await tx.insert(s.returnItems).values({ returnId: ret.id, productId: l.productId, qty: String(l.qty), unitPrice: String(l.price), unitCost: String(l.cost) });
      await moveStock(tx, { productId: l.productId, branchId: inv.branchId, qty: sale ? l.qty : -l.qty, type: sale ? 'sale_return' : 'purchase_return', ref: number, unitCost: l.cost });
    }
    if (sale) await tx.update(s.salesInvoices).set({ returned: String(newReturned), paid: String(Number(inv.paid) - refund) }).where(eq(s.salesInvoices.id, invId));
    else await tx.update(s.purchaseInvoices).set({ returned: String(newReturned), paid: String(Number(inv.paid) - refund) }).where(eq(s.purchaseInvoices.id, invId));
    if (refund > 0) await addPayment(tx as unknown as typeof db, { partyId: inv.partyId ?? null, treasuryId: treasuryId!, direction: sale ? 'out' : 'in', amount: refund, saleId: sale ? invId : undefined, purchaseId: sale ? undefined : invId, note: `رد مرتجع ${number}` });
    await audit(sale ? 'مرتجع مبيعات' : 'مرتجع مشتريات', 'returns', number, `فاتورة ${inv.number} · قيمة ${total.toFixed(2)} · رد ${refund}`, tx);
  });
  revalidatePath('/returns'); revalidatePath('/sales'); revalidatePath('/purchases'); revalidatePath('/stock'); revalidatePath('/'); redirect('/returns');
}

/* ---------- الدفعات المرحلية لأوامر الخدمة ---------- */
async function openJob(id: number) {
  await jobGuard(id); const [j] = await db.select().from(s.jobs).where(eq(s.jobs.id, id));
  if (!j || j.status === 'invoiced' || j.status === 'cancelled') throw new Error('لا يمكن تعديل دفعات هذا الأمر'); return j;
}
export async function addMilestone(f: FormData) {
  const jobId = reqInt(f, 'jobId'); const j = await openJob(jobId); const pct = num(f, 'percent'); if (pct <= 0 || pct > 100) throw new Error('النسبة غير صحيحة');
  if (Number(j.quoteAmount) <= 0) throw new Error('حدّد قيمة الأمر أولاً');
  const [{ sum }] = await db.select({ sum: sql<string>`coalesce(sum(${s.jobMilestones.percent}),0)` }).from(s.jobMilestones).where(eq(s.jobMilestones.jobId, jobId));
  if (Number(sum) + pct > 100.001) throw new Error('مجموع نسب الدفعات يتجاوز 100%');
  await db.insert(s.jobMilestones).values({ jobId, title: req(f, 'title'), percent: String(pct), amount: String((Number(j.quoteAmount) * pct / 100).toFixed(2)) });
  revalidatePath(`/jobs/${jobId}`);
}
export async function milestoneTemplate(f: FormData) {
  const jobId = reqInt(f, 'jobId'); const j = await openJob(jobId); if (Number(j.quoteAmount) <= 0) throw new Error('حدّد قيمة الأمر أولاً');
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(s.jobMilestones).where(eq(s.jobMilestones.jobId, jobId)); if (c > 0) throw new Error('توجد دفعات مسبقاً');
  const q = Number(j.quoteAmount);
  await db.insert(s.jobMilestones).values([['مقدم عند التعاقد', 30], ['عند توريد الخامات', 40], ['عند التسليم', 30]].map(([title, p]) => ({ jobId, title: title as string, percent: String(p), amount: String((q * Number(p) / 100).toFixed(2)) })));
  revalidatePath(`/jobs/${jobId}`);
}
export async function deleteMilestone(f: FormData) {
  const [m] = await db.select().from(s.jobMilestones).where(eq(s.jobMilestones.id, reqInt(f, 'id'))); if (!m) return; await openJob(m.jobId);
  if (m.invoiceId) throw new Error('الدفعة مفوترة'); await db.delete(s.jobMilestones).where(eq(s.jobMilestones.id, m.id)); revalidatePath(`/jobs/${m.jobId}`);
}
export async function invoiceMilestone(f: FormData) {
  const mid = reqInt(f, 'id'); const paid = num(f, 'paid'); const treasuryId = int(f, 'treasuryId'); await treasuryOk(treasuryId);
  const sid = await db.transaction(async (tx) => {
    const [m] = await tx.select().from(s.jobMilestones).where(eq(s.jobMilestones.id, mid)); if (!m || m.invoiceId) throw new Error('الدفعة غير متاحة للفوترة');
    const [j] = await tx.select().from(s.jobs).where(eq(s.jobs.id, m.jobId)); await mine(j.branchId);
    if (!['approved', 'in_progress', 'done'].includes(j.status)) throw new Error('اعتمد أمر الخدمة أولاً قبل فوترة الدفعات');
    const all = await tx.select().from(s.jobMilestones).where(eq(s.jobMilestones.jobId, j.id));
    const pendingOthers = all.filter((x) => x.id !== m.id && !x.invoiceId).length; const sumPct = all.reduce((a, x) => a + Number(x.percent), 0);
    const isFinal = pendingOthers === 0 && sumPct >= 99.99;
    if (isFinal && j.status !== 'done') throw new Error('الدفعة الأخيرة تُفوتر بعد إنجاز العمل (غيّر الحالة إلى «منجز»)');
    const amount = Number(m.amount); if (paid > amount) throw new Error('المدفوع أكبر من قيمة الدفعة'); if (paid > 0 && !treasuryId) throw new Error('اختر الخزينة');
    let cost = 0; // التكلفة تُحمَّل على الدفعة الأخيرة
    if (isFinal) { const mats = await tx.select().from(s.jobMaterials).where(eq(s.jobMaterials.jobId, j.id)); cost = mats.reduce((a, x) => a + Number(x.qty) * Number(x.unitCost), 0) + Number(j.laborCost); }
    const number = await nextNo('S', 'sales');
    const [inv] = await tx.insert(s.salesInvoices).values({ number, partyId: j.partyId, branchId: j.branchId, date: today(), subtotal: String(amount), discount: '0', total: String(amount), paid: String(paid), jobId: j.id, note: `أمر خدمة ${j.number} — ${m.title}` }).returning();
    await tx.insert(s.saleItems).values({ invoiceId: inv.id, lineKind: 'job', description: `${j.title} — ${m.title} (${j.number})`, qty: '1', unitPrice: String(amount), unitCost: String(cost) });
    if (paid > 0) await addPayment(tx as unknown as typeof db, { partyId: j.partyId, treasuryId: treasuryId!, direction: 'in', amount: paid, saleId: inv.id, note: `دفعة ${m.title} — ${j.number}` });
    await tx.update(s.jobMilestones).set({ invoiceId: inv.id }).where(eq(s.jobMilestones.id, m.id));
    if (isFinal) await tx.update(s.jobs).set({ status: 'invoiced' }).where(eq(s.jobs.id, j.id));
    await audit('فوترة دفعة مرحلية', 'service_jobs', j.number, `${m.title} · ${amount}`, tx);
    return inv.id;
  });
  revalidatePath('/jobs', 'layout'); revalidatePath('/sales'); revalidatePath('/accounts'); redirect(`/sales/${sid}`);
}

/* ---------- تأجير المعدات ---------- */
export async function setAssetRate(f: FormData) { const id = reqInt(f, 'id'); await assetGuard(id); await db.update(s.assets).set({ dailyRate: String(num(f, 'dailyRate')) }).where(eq(s.assets.id, id)); await audit('تعديل سعر تأجير', 'assets', String(id), String(num(f, 'dailyRate'))); revalidatePath(`/assets/${id}`); }
export async function createRental(f: FormData) {
  const a = await assetGuard(reqInt(f, 'assetId')); const partyId = reqInt(f, 'partyId'); const rate = num(f, 'dailyRate'); if (rate <= 0) throw new Error('حدّد سعر التأجير اليومي');
  const start = str(f, 'startDate') ?? today(); const exp = str(f, 'expectedEnd'); if (exp && exp < start) throw new Error('تاريخ الإرجاع المتوقع قبل تاريخ البدء');
  const deposit = num(f, 'deposit'); const tId = int(f, 'treasuryId'); await treasuryOk(tId); if (deposit > 0 && !tId) throw new Error('اختر الخزينة لاستلام العربون');
  const number = await nextNo('RN', 'rentals');
  const id = await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(s.assets).where(eq(s.assets.id, a.id)); if (cur.status !== 'running') throw new Error('المعدة غير متاحة للتأجير حالياً');
    const [{ c }] = await tx.select({ c: sql<number>`count(*)::int` }).from(s.rentals).where(and(eq(s.rentals.assetId, a.id), eq(s.rentals.status, 'active'))); if (c > 0) throw new Error('المعدة مؤجرة بالفعل');
    const [r] = await tx.insert(s.rentals).values({ number, assetId: a.id, partyId, branchId: a.branchId, startDate: start, expectedEnd: exp, dailyRate: String(rate), deposit: String(deposit), siteNote: str(f, 'siteNote'), note: str(f, 'note') }).returning();
    await tx.update(s.assets).set({ status: 'rented' }).where(eq(s.assets.id, a.id));
    if (deposit > 0) await addPayment(tx as unknown as typeof db, { partyId, treasuryId: tId!, direction: 'in', amount: deposit, note: `عربون تأجير ${number}` });
    await audit('عقد تأجير معدة', 'rentals', number, `${a.code} · ${rate}/يوم · عربون ${deposit}`, tx);
    return r.id;
  });
  revalidatePath('/rentals'); revalidatePath('/assets'); revalidatePath('/'); redirect(`/rentals/${id}`);
}
export async function returnRental(f: FormData) {
  const id = reqInt(f, 'id'); const end = str(f, 'endDate') ?? today(); const damage = num(f, 'damage'); const paidNow = num(f, 'paid'); const tId = int(f, 'treasuryId'); await treasuryOk(tId);
  const sid = await db.transaction(async (tx) => {
    const [r] = await tx.select().from(s.rentals).where(eq(s.rentals.id, id)); if (!r || r.status !== 'active') throw new Error('العقد غير نشط');
    const a = await assetGuard(r.assetId); if (end < String(r.startDate)) throw new Error('تاريخ الإرجاع قبل تاريخ البدء');
    const diff = Math.round((Date.parse(end) - Date.parse(String(r.startDate))) / 864e5); const days = num(f, 'days') > 0 ? Math.round(num(f, 'days')) : Math.max(1, diff);
    const rent = days * Number(r.dailyRate); const total = rent + damage; const deposit = Number(r.deposit); const invPaid = Math.min(total, deposit + paidNow);
    if (paidNow > Math.max(total - deposit, 0) + 0.01) throw new Error('المدفوع أكبر من المتبقي بعد خصم العربون'); if (paidNow > 0 && !tId) throw new Error('اختر الخزينة');
    const number = await nextNo('S', 'sales');
    const [inv] = await tx.insert(s.salesInvoices).values({ number, partyId: r.partyId, branchId: r.branchId, date: end, subtotal: String(total), discount: '0', total: String(total), paid: String(invPaid), note: `تأجير ${r.number}` }).returning();
    await tx.insert(s.saleItems).values({ invoiceId: inv.id, lineKind: 'rental', description: `تأجير ${a.name} (${a.code}) — ${days} يوم × ${Number(r.dailyRate)}`, qty: String(days), unitPrice: r.dailyRate, unitCost: '0' });
    if (damage > 0) await tx.insert(s.saleItems).values({ invoiceId: inv.id, lineKind: 'rental', description: `رسوم تلف/نظافة — ${r.number}`, qty: '1', unitPrice: String(damage), unitCost: '0' });
    if (paidNow > 0) await addPayment(tx as unknown as typeof db, { partyId: r.partyId, treasuryId: tId!, direction: 'in', amount: paidNow, saleId: inv.id, note: `دفعة تأجير ${r.number}`, date: end });
    const needs = f.get('needsMaintenance') === '1' || damage > 0;
    await tx.update(s.rentals).set({ status: 'returned', endDate: end, days, amount: String(total), damageCharge: String(damage), invoiceId: inv.id }).where(eq(s.rentals.id, id));
    await tx.update(s.assets).set({ status: needs ? 'maintenance' : 'running' }).where(eq(s.assets.id, a.id));
    if (needs) await tx.insert(s.workOrders).values({ number: await nextNo('WO', 'wo'), assetId: a.id, branchId: a.branchId, type: 'corrective', priority: 'medium', title: `فحص وإصلاح بعد التأجير ${r.number}`, description: str(f, 'damageNote') });
    await audit('إرجاع معدة مؤجرة', 'rentals', r.number, `${days} يوم · فاتورة ${number} · ${total}`, tx);
    return inv.id;
  });
  revalidatePath('/rentals', 'layout'); revalidatePath('/assets'); revalidatePath('/sales'); revalidatePath('/work-orders'); revalidatePath('/'); redirect(`/sales/${sid}`);
}
export async function cancelRental(f: FormData) {
  const id = reqInt(f, 'id');
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(s.rentals).where(and(eq(s.rentals.id, id), eq(s.rentals.status, 'active'))); if (!r) return; await assetGuard(r.assetId);
    if (Number(r.deposit) > 0) throw new Error('على العقد عربون مقبوض؛ أرجع المعدة وأنهِ العقد بدل الإلغاء');
    await tx.update(s.rentals).set({ status: 'cancelled' }).where(eq(s.rentals.id, id));
    await tx.update(s.assets).set({ status: 'running' }).where(eq(s.assets.id, r.assetId));
    await audit('إلغاء عقد تأجير', 'rentals', r.number, '', tx);
  });
  revalidatePath('/rentals', 'layout'); revalidatePath('/assets');
}

/* ---------- الإهلاك والباركود للأصول ---------- */
export async function setAssetDep(f: FormData) {
  const id = reqInt(f, 'id'); await assetGuard(id);
  await db.update(s.assets).set({ lifeYears: int(f, 'lifeYears'), salvageValue: String(num(f, 'salvageValue')), barcode: str(f, 'barcode') }).where(eq(s.assets.id, id));
  await audit('تعديل إهلاك/باركود معدة', 'assets', String(id), ''); revalidatePath(`/assets/${id}`);
}

/* ---------- عروض الأسعار ---------- */
type QLine = { productId: number | null; description: string; qty: number; price: number };
export async function createQuote(f: FormData) {
  const arr = (JSON.parse(String(f.get('items') ?? '[]')) as QLine[]).filter((l) => l.description?.trim() && l.qty > 0 && l.price >= 0); if (!arr.length) throw new Error('أضف بنداً واحداً على الأقل');
  const branchId = await bid(f); const partyId = int(f, 'partyId'); const customerName = str(f, 'customerName'); if (!partyId && !customerName) throw new Error('اختر العميل أو اكتب اسمه');
  const subtotal = r2(arr.reduce((a, l) => a + l.qty * l.price, 0)); const discount = r2(num(f, 'discount')); const total = Math.max(subtotal - discount, 0); const number = await nextNo('Q', 'quotes');
  const id = await db.transaction(async (tx) => {
    const [q] = await tx.insert(s.quotes).values({ number, partyId, customerName, branchId, date: str(f, 'date') ?? today(), validUntil: str(f, 'validUntil'), subtotal: String(subtotal), discount: String(discount), total: String(total), note: str(f, 'note') }).returning();
    for (const l of arr) await tx.insert(s.quoteItems).values({ quoteId: q.id, productId: l.productId || null, description: l.description.trim(), qty: String(l.qty), unitPrice: String(l.price) });
    await audit('إنشاء عرض سعر', 'quotes', number, `${total}`, tx); return q.id;
  });
  revalidatePath('/quotes'); redirect(`/quotes/${id}`);
}
export async function rejectQuote(f: FormData) { const id = reqInt(f, 'id'); const [q] = await db.select().from(s.quotes).where(eq(s.quotes.id, id)); if (!q) return; await mine(q.branchId); await db.update(s.quotes).set({ status: 'rejected' }).where(and(eq(s.quotes.id, id), eq(s.quotes.status, 'open'))); await audit('رفض عرض سعر', 'quotes', q.number, ''); revalidatePath(`/quotes/${id}`); revalidatePath('/quotes'); }
export async function convertQuote(f: FormData) {
  const id = reqInt(f, 'id'); const paid = num(f, 'paid'); const tId = int(f, 'treasuryId'); await treasuryOk(tId);
  const sid = await db.transaction(async (tx) => {
    const [q] = await tx.select().from(s.quotes).where(and(eq(s.quotes.id, id), eq(s.quotes.status, 'open'))); if (!q) throw new Error('العرض غير متاح للتحويل'); await mine(q.branchId);
    const items = await tx.select().from(s.quoteItems).where(eq(s.quoteItems.quoteId, id)); const total = Number(q.total);
    if (paid > total + 0.05) throw new Error('المدفوع أكبر من الإجمالي'); if (paid < total && !q.partyId) throw new Error('البيع الآجل يتطلب عميلاً مسجلاً؛ سجّل العميل أو ادفع كامل المبلغ');
    if (paid > 0 && !tId) throw new Error('اختر الخزينة'); const pay = Math.min(paid, total); const number = await nextNo('S', 'sales');
    const [inv] = await tx.insert(s.salesInvoices).values({ number, partyId: q.partyId, branchId: q.branchId, date: today(), subtotal: q.subtotal, discount: q.discount, total: q.total, paid: String(pay), note: `من عرض السعر ${q.number}${q.customerName ? ' — ' + q.customerName : ''}` }).returning();
    for (const it of items) {
      if (it.productId) { const [p] = await tx.select().from(s.products).where(eq(s.products.id, it.productId)); await tx.insert(s.saleItems).values({ invoiceId: inv.id, productId: p.id, description: it.description, qty: it.qty, unitPrice: it.unitPrice, unitCost: p.avgCost }); await moveStock(tx, { productId: p.id, branchId: q.branchId, qty: -Number(it.qty), type: 'sale', ref: number, unitCost: Number(p.avgCost) }); }
      else await tx.insert(s.saleItems).values({ invoiceId: inv.id, lineKind: 'service', description: it.description, qty: it.qty, unitPrice: it.unitPrice, unitCost: '0' });
    }
    if (pay > 0) await addPayment(tx as unknown as typeof db, { partyId: q.partyId, treasuryId: tId!, direction: 'in', amount: pay, saleId: inv.id, note: `دفعة فاتورة ${number}` });
    await tx.update(s.quotes).set({ status: 'converted', invoiceId: inv.id }).where(eq(s.quotes.id, id)); await audit('تحويل عرض سعر لفاتورة', 'quotes', q.number, number, tx); return inv.id;
  });
  revalidatePath('/quotes'); revalidatePath('/sales'); revalidatePath('/stock'); revalidatePath('/'); redirect(`/sales/${sid}`);
}

/* ---------- الجرد الفعلي ---------- */
export async function createStocktake(f: FormData) {
  const branchId = await bid(f); const number = await nextNo('ST', 'stocktakes');
  const id = await db.transaction(async (tx) => {
    const [st] = await tx.insert(s.stocktakes).values({ number, branchId, date: today(), note: str(f, 'note') }).returning();
    await tx.execute(sql`insert into stocktake_items (stocktake_id, product_id, system_qty) select ${st.id}, p.id, coalesce(sk.qty,0) from products p left join stock sk on sk.product_id=p.id and sk.branch_id=${branchId} where p.active`);
    await audit('بدء جرد', 'stocktakes', number, `الفرع ${branchId}`, tx); return st.id;
  });
  revalidatePath('/stocktakes'); redirect(`/stocktakes/${id}`);
}
async function saveCounts(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: number, f: FormData) {
  const counts = JSON.parse(String(f.get('counts') ?? '{}')) as Record<string, string | number | null>;
  for (const [pid, v] of Object.entries(counts)) { const n = v === '' || v === null ? null : Number(v); if (n !== null && (isNaN(n) || n < 0)) throw new Error('كمية غير صحيحة'); await tx.update(s.stocktakeItems).set({ countedQty: n === null ? null : String(n) }).where(and(eq(s.stocktakeItems.stocktakeId, id), eq(s.stocktakeItems.productId, Number(pid)))); }
}
export async function saveStocktake(f: FormData) {
  const id = reqInt(f, 'id'); await db.transaction(async (tx) => { const [st] = await tx.select().from(s.stocktakes).where(and(eq(s.stocktakes.id, id), eq(s.stocktakes.status, 'open'))); if (!st) throw new Error('الجرد مُعتمد'); await mine(st.branchId); await saveCounts(tx, id, f); });
  revalidatePath(`/stocktakes/${id}`);
}
export async function postStocktake(f: FormData) {
  const id = reqInt(f, 'id');
  await db.transaction(async (tx) => {
    const [st] = await tx.select().from(s.stocktakes).where(and(eq(s.stocktakes.id, id), eq(s.stocktakes.status, 'open'))); if (!st) throw new Error('الجرد مُعتمد'); await mine(st.branchId); await saveCounts(tx, id, f);
    const items = await tx.select().from(s.stocktakeItems).where(eq(s.stocktakeItems.stocktakeId, id)); let n = 0;
    for (const it of items) { if (it.countedQty === null) continue; const diff = Number(it.countedQty) - Number(it.systemQty); if (Math.abs(diff) < 0.0005) continue; await moveStock(tx, { productId: it.productId, branchId: st.branchId, qty: diff, type: 'stocktake', ref: st.number, note: 'تسوية جرد' }); n++; }
    await tx.update(s.stocktakes).set({ status: 'posted' }).where(eq(s.stocktakes.id, id)); await audit('اعتماد جرد', 'stocktakes', st.number, `${n} صنف بفروقات`, tx);
  });
  revalidatePath('/stocktakes', 'layout'); revalidatePath('/stock'); redirect(`/stocktakes/${id}`);
}

/* ---------- الشيكات ---------- */
export async function createCheque(f: FormData) {
  const direction = req(f, 'direction') === 'out' ? 'out' : 'in'; const amount = num(f, 'amount'); if (amount <= 0) throw new Error('المبلغ غير صحيح');
  const branchId = await bid(f); let invoiceId: number | null = null; const invNo = str(f, 'invoiceNo');
  if (invNo) { const t = direction === 'in' ? s.salesInvoices : s.purchaseInvoices; const [i] = await db.select().from(t).where(eq(t.number, invNo)); if (!i) throw new Error('رقم الفاتورة غير موجود'); await mine(i.branchId); invoiceId = i.id; }
  await db.insert(s.cheques).values({ number: req(f, 'number'), direction, partyId: reqInt(f, 'partyId'), branchId, bank: str(f, 'bank'), amount: String(amount), dueDate: req(f, 'dueDate'), invoiceId, note: str(f, 'note') });
  await audit(direction === 'in' ? 'استلام شيك' : 'إصدار شيك', 'cheques', req(f, 'number'), String(amount)); revalidatePath('/cheques'); redirect('/cheques');
}
export async function settleCheque(f: FormData) {
  const id = reqInt(f, 'id'); const bounce = f.get('result') === 'bounce'; const tId = int(f, 'treasuryId'); await treasuryOk(tId);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(s.cheques).where(and(eq(s.cheques.id, id), eq(s.cheques.status, 'pending'))); if (!c) throw new Error('الشيك غير معلّق'); await mine(c.branchId);
    if (bounce) { await tx.update(s.cheques).set({ status: 'bounced', settledAt: today() }).where(eq(s.cheques.id, id)); await audit('شيك مرتد', 'cheques', c.number, '', tx); return; }
    if (!tId) throw new Error('اختر الخزينة/الحساب البنكي'); const amount = Number(c.amount);
    if (c.invoiceId) {
      if (c.direction === 'in') { const [r] = await tx.update(s.salesInvoices).set({ paid: sql`${s.salesInvoices.paid} + ${amount}` }).where(and(eq(s.salesInvoices.id, c.invoiceId), sql`${s.salesInvoices.paid} + ${amount} <= ${s.salesInvoices.total} - ${s.salesInvoices.returned}`, eq(s.salesInvoices.status, 'active'))).returning(); if (!r) throw new Error('مبلغ الشيك أكبر من المتبقي على الفاتورة'); }
      else { const [r] = await tx.update(s.purchaseInvoices).set({ paid: sql`${s.purchaseInvoices.paid} + ${amount}` }).where(and(eq(s.purchaseInvoices.id, c.invoiceId), sql`${s.purchaseInvoices.paid} + ${amount} <= ${s.purchaseInvoices.total} - ${s.purchaseInvoices.returned}`, eq(s.purchaseInvoices.status, 'active'))).returning(); if (!r) throw new Error('مبلغ الشيك أكبر من المتبقي على الفاتورة'); }
    }
    await addPayment(tx as unknown as typeof db, { partyId: c.partyId, treasuryId: tId, direction: c.direction as 'in' | 'out', amount, saleId: c.direction === 'in' ? c.invoiceId ?? undefined : undefined, purchaseId: c.direction === 'out' ? c.invoiceId ?? undefined : undefined, note: `شيك رقم ${c.number}${c.bank ? ' — ' + c.bank : ''}` });
    await tx.update(s.cheques).set({ status: 'cleared', treasuryId: tId, settledAt: today() }).where(eq(s.cheques.id, id)); await audit(c.direction === 'in' ? 'تحصيل شيك' : 'صرف شيك', 'cheques', c.number, String(amount), tx);
  });
  revalidatePath('/cheques'); revalidatePath('/accounts'); revalidatePath('/parties'); revalidatePath('/sales'); revalidatePath('/purchases'); revalidatePath('/');
}

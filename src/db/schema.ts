import { pgTable, serial, text, integer, numeric, timestamp, date, boolean, unique } from 'drizzle-orm/pg-core';
const money = (n: string) => numeric(n, { precision: 16, scale: 2 }).notNull().default('0');
const qty = (n: string) => numeric(n, { precision: 14, scale: 3 }).notNull().default('0');

export const branches = pgTable('branches', { id: serial('id').primaryKey(), name: text('name').notNull(), kind: text('kind').notNull().default('branch') }); // branch | department
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(), name: text('name').notNull(),
  kind: text('kind').notNull().default('equipment'), // equipment | safety | iron | material
});
export const products = pgTable('products', {
  id: serial('id').primaryKey(), code: text('code').notNull().unique(), name: text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id), unit: text('unit').notNull().default('قطعة'),
  salePrice: money('sale_price'), usdPrice: money('usd_price'), barcode: text('barcode').unique(), avgCost: money('avg_cost'), minQty: qty('min_qty'), active: boolean('active').notNull().default(true),
});
export const stock = pgTable('stock', {
  id: serial('id').primaryKey(), productId: integer('product_id').notNull().references(() => products.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), qty: qty('qty'),
}, (t) => [unique().on(t.productId, t.branchId)]);
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(), productId: integer('product_id').notNull().references(() => products.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), qty: numeric('qty', { precision: 14, scale: 3 }).notNull(),
  type: text('type').notNull(), ref: text('ref'), unitCost: money('unit_cost'), note: text('note'), createdAt: timestamp('created_at').notNull().defaultNow(),
});
export const parties = pgTable('parties', {
  id: serial('id').primaryKey(), name: text('name').notNull(), type: text('type').notNull(), // customer | supplier
  phone: text('phone'), address: text('address'), openingBalance: money('opening_balance'),
});
export const treasury = pgTable('treasury', {
  id: serial('id').primaryKey(), name: text('name').notNull(), branchId: integer('branch_id').references(() => branches.id),
  type: text('type').notNull().default('cash'), openingBalance: money('opening_balance'),
});
export const salesInvoices = pgTable('sales_invoices', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), partyId: integer('party_id').references(() => parties.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), date: date('date').notNull(),
  subtotal: money('subtotal'), discount: money('discount'), total: money('total'), paid: money('paid'), returned: money('returned'),
  jobId: integer('job_id'), currency: text('currency').notNull().default('SDG'), fxRate: numeric('fx_rate', { precision: 14, scale: 4 }).notNull().default('1'), status: text('status').notNull().default('active'), note: text('note'),
});
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(), invoiceId: integer('invoice_id').notNull().references(() => salesInvoices.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id), description: text('description').notNull(), lineKind: text('line_kind'),
  qty: qty('qty'), unitPrice: money('unit_price'), unitCost: money('unit_cost'),
});
export const purchaseInvoices = pgTable('purchase_invoices', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), partyId: integer('party_id').notNull().references(() => parties.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), date: date('date').notNull(),
  total: money('total'), extraCosts: money('extra_costs'), paid: money('paid'), returned: money('returned'), currency: text('currency').notNull().default('SDG'), fxRate: numeric('fx_rate', { precision: 14, scale: 4 }).notNull().default('1'), status: text('status').notNull().default('active'), note: text('note'), supplierRef: text('supplier_ref'),
});
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(), invoiceId: integer('invoice_id').notNull().references(() => purchaseInvoices.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id), qty: qty('qty'), unitCost: money('unit_cost'), landedUnitCost: money('landed_unit_cost'),
});
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(), date: date('date').notNull(), partyId: integer('party_id').references(() => parties.id),
  treasuryId: integer('treasury_id').notNull().references(() => treasury.id), direction: text('direction').notNull(), // in | out
  amount: money('amount'), salesInvoiceId: integer('sales_invoice_id').references(() => salesInvoices.id),
  purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id), note: text('note'),
});
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(), date: date('date').notNull(), branchId: integer('branch_id').notNull().references(() => branches.id),
  treasuryId: integer('treasury_id').notNull().references(() => treasury.id), category: text('category').notNull(), amount: money('amount'), note: text('note'),
});
export const transfers = pgTable('transfers', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), fromBranchId: integer('from_branch_id').notNull().references(() => branches.id),
  toBranchId: integer('to_branch_id').notNull().references(() => branches.id), date: date('date').notNull(), note: text('note'),
});
export const transferItems = pgTable('transfer_items', {
  id: serial('id').primaryKey(), transferId: integer('transfer_id').notNull().references(() => transfers.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id), qty: qty('qty'),
});
export const jobs = pgTable('service_jobs', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), partyId: integer('party_id').notNull().references(() => parties.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), kind: text('kind').notNull(), // gable | hangar | other
  title: text('title').notNull(), siteAddress: text('site_address'), status: text('status').notNull().default('quote'), // quote|approved|in_progress|done|invoiced|cancelled
  quoteAmount: money('quote_amount'), laborCost: money('labor_cost'), startDate: date('start_date'), endDate: date('end_date'), notes: text('notes'),
});
export const jobMaterials = pgTable('job_materials', {
  id: serial('id').primaryKey(), jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id), qty: qty('qty'), unitCost: money('unit_cost'),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(), username: text('username').notNull().unique(), name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(), role: text('role').notNull().default('branch'), // admin | branch
  branchId: integer('branch_id').references(() => branches.id), active: boolean('active').notNull().default(true),
});
export const settings = pgTable('settings', { key: text('key').primaryKey(), value: text('value').notNull().default('') });

/* ---- صيانة المعدات (أصول الشركة) ---- */
export const technicians = pgTable('technicians', { id: serial('id').primaryKey(), name: text('name').notNull(), phone: text('phone'), specialty: text('specialty'), branchId: integer('branch_id').references(() => branches.id), active: boolean('active').notNull().default(true) });
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(), code: text('code').notNull().unique(), name: text('name').notNull(), branchId: integer('branch_id').notNull().references(() => branches.id),
  category: text('category'), manufacturer: text('manufacturer'), model: text('model'), serial: text('serial'), purchaseDate: date('purchase_date'), purchaseCost: money('purchase_cost'), dailyRate: money('daily_rate'), barcode: text('barcode').unique(), lifeYears: integer('life_years'), salvageValue: money('salvage_value'),
  status: text('status').notNull().default('running'), criticality: text('criticality').notNull().default('medium'), notes: text('notes'),
});
export const maintenancePlans = pgTable('maintenance_plans', {
  id: serial('id').primaryKey(), assetId: integer('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }), title: text('title').notNull(),
  intervalDays: integer('interval_days').notNull(), lastDone: date('last_done'), nextDue: date('next_due').notNull(), active: boolean('active').notNull().default(true),
});
export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), assetId: integer('asset_id').notNull().references(() => assets.id),
  branchId: integer('branch_id').notNull().references(() => branches.id), planId: integer('plan_id').references(() => maintenancePlans.id, { onDelete: 'set null' }),
  type: text('type').notNull(), priority: text('priority').notNull().default('medium'), title: text('title').notNull(), description: text('description'),
  status: text('status').notNull().default('open'), technicianId: integer('technician_id').references(() => technicians.id),
  reportedAt: timestamp('reported_at').notNull().defaultNow(), startedAt: timestamp('started_at'), completedAt: timestamp('completed_at'),
  laborHours: numeric('labor_hours', { precision: 8, scale: 2 }).notNull().default('0'), laborCost: money('labor_cost'), downtimeHours: numeric('downtime_hours', { precision: 8, scale: 2 }).notNull().default('0'), resolution: text('resolution'),
});
export const workOrderParts = pgTable('work_order_parts', {
  id: serial('id').primaryKey(), workOrderId: integer('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id), qty: qty('qty'), unitCost: money('unit_cost'),
});

export const returns = pgTable('returns', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), type: text('type').notNull(), // sale | purchase
  salesInvoiceId: integer('sales_invoice_id').references(() => salesInvoices.id), purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id),
  partyId: integer('party_id').references(() => parties.id), branchId: integer('branch_id').notNull().references(() => branches.id), date: date('date').notNull(),
  total: money('total'), refund: money('refund'), note: text('note'),
});
export const returnItems = pgTable('return_items', {
  id: serial('id').primaryKey(), returnId: integer('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id), qty: qty('qty'), unitPrice: money('unit_price'), unitCost: money('unit_cost'),
});
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(), at: timestamp('at').notNull().defaultNow(), userId: integer('user_id'), userName: text('user_name'),
  action: text('action').notNull(), entity: text('entity'), ref: text('ref'), details: text('details'),
});

export const purchaseCosts = pgTable('purchase_costs', {
  id: serial('id').primaryKey(), invoiceId: integer('invoice_id').notNull().references(() => purchaseInvoices.id, { onDelete: 'cascade' }), label: text('label').notNull(), amount: money('amount'),
});
export const rates = pgTable('rates', { id: serial('id').primaryKey(), at: timestamp('at').notNull().defaultNow(), rate: numeric('rate', { precision: 14, scale: 4 }).notNull(), userName: text('user_name'), updated: integer('updated').notNull().default(0) });
export const jobMilestones = pgTable('job_milestones', {
  id: serial('id').primaryKey(), jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }), title: text('title').notNull(),
  percent: numeric('percent', { precision: 6, scale: 2 }).notNull(), amount: money('amount'), invoiceId: integer('invoice_id').references(() => salesInvoices.id),
});

export const rentals = pgTable('rentals', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), assetId: integer('asset_id').notNull().references(() => assets.id),
  partyId: integer('party_id').notNull().references(() => parties.id), branchId: integer('branch_id').notNull().references(() => branches.id),
  startDate: date('start_date').notNull(), expectedEnd: date('expected_end'), endDate: date('end_date'), dailyRate: money('daily_rate'), deposit: money('deposit'),
  days: integer('days'), amount: money('amount'), damageCharge: money('damage_charge'), status: text('status').notNull().default('active'), // active | returned | cancelled
  invoiceId: integer('invoice_id').references(() => salesInvoices.id), siteNote: text('site_note'), note: text('note'),
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), partyId: integer('party_id').references(() => parties.id), customerName: text('customer_name'),
  branchId: integer('branch_id').notNull().references(() => branches.id), date: date('date').notNull(), validUntil: date('valid_until'),
  subtotal: money('subtotal'), discount: money('discount'), total: money('total'), status: text('status').notNull().default('open'), // open | converted | rejected
  invoiceId: integer('invoice_id').references(() => salesInvoices.id), note: text('note'),
});
export const quoteItems = pgTable('quote_items', {
  id: serial('id').primaryKey(), quoteId: integer('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }), productId: integer('product_id').references(() => products.id),
  description: text('description').notNull(), qty: qty('qty'), unitPrice: money('unit_price'),
});
export const stocktakes = pgTable('stocktakes', {
  id: serial('id').primaryKey(), number: text('number').notNull().unique(), branchId: integer('branch_id').notNull().references(() => branches.id), date: date('date').notNull(),
  status: text('status').notNull().default('open'), note: text('note'), // open | posted
});
export const stocktakeItems = pgTable('stocktake_items', {
  id: serial('id').primaryKey(), stocktakeId: integer('stocktake_id').notNull().references(() => stocktakes.id, { onDelete: 'cascade' }), productId: integer('product_id').notNull().references(() => products.id),
  systemQty: qty('system_qty'), countedQty: numeric('counted_qty', { precision: 14, scale: 3 }),
}, (t) => [unique().on(t.stocktakeId, t.productId)]);
export const cheques = pgTable('cheques', {
  id: serial('id').primaryKey(), number: text('number').notNull(), direction: text('direction').notNull(), // in = مستلم من عميل | out = مدفوع لمورد
  partyId: integer('party_id').notNull().references(() => parties.id), branchId: integer('branch_id').notNull().references(() => branches.id),
  bank: text('bank'), amount: money('amount'), dueDate: date('due_date').notNull(), status: text('status').notNull().default('pending'), // pending | cleared | bounced
  invoiceId: integer('invoice_id'), treasuryId: integer('treasury_id').references(() => treasury.id), settledAt: date('settled_at'), note: text('note'),
});

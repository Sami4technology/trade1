import { canAccess } from '@/lib/branch';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, schema as s } from '@/db';
import { cancelPurchase } from '@/lib/actions';
import { Badge, Btn, Card, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
import InvoiceHeader, { InvoiceFooter } from '@/components/InvoiceHeader';
import PrintBtn from '@/components/PrintBtn';
export const dynamic = 'force-dynamic';
export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [r] = await db.select({ i: s.purchaseInvoices, p: s.parties.name, b: s.branches.name }).from(s.purchaseInvoices).innerJoin(s.parties, eq(s.parties.id, s.purchaseInvoices.partyId)).innerJoin(s.branches, eq(s.branches.id, s.purchaseInvoices.branchId)).where(eq(s.purchaseInvoices.id, id));
  if (!r) notFound(); const { i } = r; if (!(await canAccess(i.branchId))) notFound();
  const items = await db.select({ x: s.purchaseItems, p: s.products }).from(s.purchaseItems).innerJoin(s.products, eq(s.products.id, s.purchaseItems.productId)).where(eq(s.purchaseItems.invoiceId, id));
  const costs = await db.select().from(s.purchaseCosts).where(eq(s.purchaseCosts.invoiceId, id));
  const rem = Number(i.total) - Number(i.returned) - Number(i.paid);
  return (<div className="max-w-3xl"><div className="print:hidden"><PageHeader title={`فاتورة شراء ${i.number}`} /></div>
    <Card className="mb-4 print:border-0 print:shadow-none"><InvoiceHeader title="فاتورة شراء" number={i.number} branch={r.b} /><div className="mb-3 grid grid-cols-2 gap-2 text-sm"><div>المورد: <b>{r.p}</b></div><div>الفرع: <b>{r.b}</b></div><div>التاريخ: <b>{fmtDate(i.date)}</b></div><div>فاتورة المورد: <b>{i.supplierRef ?? '—'}</b></div>{i.status === 'cancelled' && <Badge cls="bg-red-100 text-red-800">ملغاة</Badge>}</div>
      <Table head={['الصنف', 'الكمية', 'سعر المورد', 'التكلفة الواصلة', 'الإجمالي']}>{items.map(({ x, p }) => <tr key={x.id}><Td>{p.code} — {p.name}</Td><Td>{fmt(x.qty)} {p.unit}</Td><Td>{fmt(x.unitCost)}</Td><Td className={Number(x.landedUnitCost) > Number(x.unitCost) ? 'font-semibold text-amber-700' : ''}>{fmt(Number(x.landedUnitCost) > 0 ? x.landedUnitCost : x.unitCost)}</Td><Td>{fmt(Number(x.qty) * Number(x.unitCost))}</Td></tr>)}</Table>
      {costs.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"><b>مصاريف الاستيراد:</b> {costs.map((c) => `${c.label} ${fmt(c.amount)}`).join(' · ')} — الإجمالي {fmt(i.extraCosts)}</div>}
      <div className="mt-3 space-y-1 text-sm"><div className="font-bold">الإجمالي: {fmt(i.total)}</div>{i.currency === 'USD' && <div className="text-gray-600">ما يعادل: <b>{fmt(Number(i.total) / Number(i.fxRate))} $</b> (سعر الصرف {fmt(i.fxRate)})</div>}{Number(i.returned) > 0 && <div className="text-amber-700">مرتجعات: {fmt(i.returned)}</div>}<div>المدفوع: {fmt(i.paid)}</div><div className={rem > 0 ? 'font-semibold text-red-700' : ''}>المتبقي: {fmt(rem)}</div></div><InvoiceFooter /></Card>
    <div className="flex gap-3 print:hidden"><PrintBtn />{i.status === 'active' && <Link href={`/returns/new?type=purchase&invoiceId=${id}`} className="rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm text-amber-700">مرتجع مشتريات</Link>}{rem > 0 && i.status === 'active' && <Link href={`/accounts/new?direction=out&partyId=${i.partyId}&invoiceId=${id}&back=/purchases/${id}`} className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white">تسجيل دفعة للمورد</Link>}
      {i.status === 'active' && Number(i.paid) === 0 && Number(i.returned) === 0 && <form action={cancelPurchase}><input type="hidden" name="id" value={id} /><Btn variant="danger">إلغاء الفاتورة</Btn></form>}</div></div>);
}

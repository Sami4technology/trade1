import { canAccess } from '@/lib/branch';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, schema as s } from '@/db';
import { cancelSale } from '@/lib/actions';
import { Badge, Btn, Card, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
import InvoiceHeader, { InvoiceFooter } from '@/components/InvoiceHeader';
import PrintBtn from '@/components/PrintBtn';
export const dynamic = 'force-dynamic';
export default async function SaleDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [r] = await db.select({ i: s.salesInvoices, p: s.parties.name, b: s.branches.name }).from(s.salesInvoices).leftJoin(s.parties, eq(s.parties.id, s.salesInvoices.partyId)).innerJoin(s.branches, eq(s.branches.id, s.salesInvoices.branchId)).where(eq(s.salesInvoices.id, id));
  if (!r) notFound(); const { i } = r; if (!(await canAccess(i.branchId))) notFound();
  const items = await db.select().from(s.saleItems).where(eq(s.saleItems.invoiceId, id));
  const rem = Number(i.total) - Number(i.returned) - Number(i.paid);
  return (<div className="max-w-3xl"><div className="print:hidden"><PageHeader title={`فاتورة بيع ${i.number}`} /></div>
    <Card className="mb-4 print:border-0 print:shadow-none"><InvoiceHeader title="فاتورة بيع" number={i.number} branch={r.b} /><div className="mb-3 grid grid-cols-2 gap-2 text-sm"><div>العميل: <b>{r.p ?? 'نقدي'}</b></div><div>الفرع: <b>{r.b}</b></div><div>التاريخ: <b>{fmtDate(i.date)}</b></div>{i.status === 'cancelled' && <Badge cls="bg-red-100 text-red-800">ملغاة</Badge>}</div>
      <Table head={['البيان', 'الكمية', 'السعر', 'الإجمالي']}>{items.map((x) => <tr key={x.id}><Td>{x.description}</Td><Td>{fmt(x.qty)}</Td><Td>{fmt(x.unitPrice)}</Td><Td>{fmt(Number(x.qty) * Number(x.unitPrice))}</Td></tr>)}</Table>
      <div className="mt-3 space-y-1 text-sm"><div>المجموع: {fmt(i.subtotal)}</div><div>الخصم: {fmt(i.discount)}</div><div className="font-bold">الإجمالي: {fmt(i.total)}</div>{i.currency === 'USD' && <div className="text-gray-600">ما يعادل: <b>{fmt(Number(i.total) / Number(i.fxRate))} $</b> (سعر الصرف {fmt(i.fxRate)})</div>}{Number(i.returned) > 0 && <div className="text-amber-700">مرتجعات: {fmt(i.returned)}</div>}<div>المدفوع: {fmt(i.paid)}</div><div className={rem > 0 ? 'font-semibold text-red-700' : ''}>المتبقي: {fmt(rem)}</div></div><InvoiceFooter /></Card>
    <div className="flex gap-3 print:hidden"><PrintBtn />{i.status === 'active' && items.some((x) => x.productId) && <Link href={`/returns/new?type=sale&invoiceId=${id}`} className="rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm text-amber-700">مرتجع مبيعات</Link>}{rem > 0 && i.status === 'active' && <Link href={`/accounts/new?direction=in&partyId=${i.partyId ?? ''}&invoiceId=${id}&back=/sales/${id}`} className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white">تسجيل دفعة</Link>}
      {i.status === 'active' && !i.jobId && Number(i.paid) === 0 && Number(i.returned) === 0 && <form action={cancelSale}><input type="hidden" name="id" value={id} /><Btn variant="danger">إلغاء الفاتورة</Btn></form>}</div></div>);
}

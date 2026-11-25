import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, schema as s } from '@/db';
import { canAccess, visibleTreasuries } from '@/lib/branch';
import { convertQuote, rejectQuote } from '@/lib/actions';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { fmt, fmtDate, qSt } from '@/lib/labels';
import InvoiceHeader from '@/components/InvoiceHeader';
import PrintBtn from '@/components/PrintBtn';
export const dynamic = 'force-dynamic';
export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [r] = await db.select({ q: s.quotes, p: s.parties.name, b: s.branches.name }).from(s.quotes).leftJoin(s.parties, eq(s.parties.id, s.quotes.partyId)).innerJoin(s.branches, eq(s.branches.id, s.quotes.branchId)).where(eq(s.quotes.id, id));
  if (!r || !(await canAccess(r.q.branchId))) notFound(); const { q } = r; const items = await db.select().from(s.quoteItems).where(eq(s.quoteItems.quoteId, id)); const tre = await visibleTreasuries();
  return (<div className="max-w-3xl"><div className="print:hidden"><PageHeader title={`عرض سعر ${q.number}`} /></div>
    <Card className="mb-4 print:border-0 print:shadow-none"><InvoiceHeader title="عرض سعر" number={q.number} branch={r.b} />
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm"><div>العميل: <b>{r.p ?? q.customerName}</b></div><div>التاريخ: <b>{fmtDate(q.date)}</b></div><div>صالح حتى: <b>{fmtDate(q.validUntil)}</b></div><div className="print:hidden">الحالة: <Badge cls={qSt[q.status].cls}>{qSt[q.status].label}</Badge></div></div>
      <Table head={['البيان', 'الكمية', 'السعر', 'الإجمالي']}>{items.map((x) => <tr key={x.id}><Td>{x.description}</Td><Td>{fmt(x.qty)}</Td><Td>{fmt(x.unitPrice)}</Td><Td>{fmt(Number(x.qty) * Number(x.unitPrice))}</Td></tr>)}</Table>
      <div className="mt-3 space-y-1 text-sm"><div>المجموع: {fmt(q.subtotal)}</div><div>الخصم: {fmt(q.discount)}</div><div className="font-bold">الإجمالي: {fmt(q.total)}</div></div>{q.note && <p className="mt-3 text-sm text-gray-600">{q.note}</p>}</Card>
    <div className="flex flex-wrap gap-3 print:hidden"><PrintBtn />{q.invoiceId && <Link className="rounded-lg border px-4 py-2 text-sm text-brand" href={`/sales/${q.invoiceId}`}>عرض الفاتورة</Link>}</div>
    {q.status === 'open' && <><Card className="mt-4 print:hidden"><h2 className="mb-3 font-semibold">تحويل إلى فاتورة بيع (يخصم المخزون)</h2><form action={convertQuote} className="grid gap-3 md:grid-cols-3"><input type="hidden" name="id" value={id} /><Field label="مدفوع الآن (0 = آجل)"><Input name="paid" type="number" step="0.01" min="0" defaultValue="0" /></Field><Field label="الخزينة"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field><div className="pt-6"><Btn>تحويل لفاتورة</Btn></div></form></Card>
      <form action={rejectQuote} className="mt-3 print:hidden"><input type="hidden" name="id" value={id} /><Btn variant="ghost">تسجيل كمرفوض</Btn></form></>}</div>);
}

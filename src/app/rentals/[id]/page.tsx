import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { canAccess, visibleTreasuries } from '@/lib/branch';
import { cancelRental, returnRental } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { fmt, fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function RentalDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [x] = await db.select({ r: s.rentals, a: s.assets, p: s.parties.name }).from(s.rentals).innerJoin(s.assets, eq(s.assets.id, s.rentals.assetId)).innerJoin(s.parties, eq(s.parties.id, s.rentals.partyId)).where(eq(s.rentals.id, id)); if (!x || !(await canAccess(x.r.branchId))) notFound();
  const { r, a, p } = x; const tre = await visibleTreasuries(); const today = new Date().toISOString().slice(0, 10);
  const info: [string, string][] = [['المعدة', `${a.code} — ${a.name}`], ['العميل', p], ['من', fmtDate(r.startDate)], ['الإرجاع المتوقع', fmtDate(r.expectedEnd)], ['السعر اليومي', fmt(r.dailyRate)], ['العربون', fmt(r.deposit)], ['موقع الاستخدام', r.siteNote ?? '—'], ['الحالة', { active: 'نشط', returned: 'أُرجعت', cancelled: 'ملغي' }[r.status] ?? r.status]];
  return (<div className="max-w-3xl"><PageHeader title={`عقد تأجير ${r.number}`} /><Card className="mb-4"><dl className="grid grid-cols-2 gap-3 text-sm">{info.map(([k, v]) => <div key={k}><dt className="text-gray-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>{r.note && <p className="mt-3 text-sm text-gray-600">{r.note}</p>}</Card>
    {r.status === 'returned' && <Card><div className="space-y-1 text-sm"><div>تاريخ الإرجاع: <b>{fmtDate(r.endDate)}</b> · المدة: <b>{r.days}</b> يوم</div><div>رسوم التلف: <b>{fmt(r.damageCharge)}</b> · الإجمالي: <b>{fmt(r.amount)}</b></div>{r.invoiceId && <Link className="text-brand" href={`/sales/${r.invoiceId}`}>عرض الفاتورة</Link>}</div></Card>}
    {r.status === 'active' && <><Card className="mb-4"><h2 className="mb-3 font-semibold">استلام المعدة وإنهاء العقد</h2><form action={returnRental} className="grid gap-4 md:grid-cols-2"><input type="hidden" name="id" value={id} />
      <Field label="تاريخ الإرجاع"><Input name="endDate" type="date" defaultValue={today} /></Field><Field label="عدد الأيام (فارغ = حسب التواريخ، حد أدنى يوم)"><Input name="days" type="number" min="0" /></Field>
      <Field label="رسوم تلف / نظافة"><Input name="damage" type="number" step="0.01" min="0" defaultValue="0" /></Field><Field label="مدفوع الآن (بعد خصم العربون)"><Input name="paid" type="number" step="0.01" min="0" defaultValue="0" /></Field>
      <Field label="الخزينة"><Select name="treasuryId"><option value="">—</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="needsMaintenance" value="1" /> تحتاج فحصاً/صيانة (يُفتح أمر عمل)</label>
      <div className="md:col-span-2"><Field label="وصف الحالة / التلف"><Textarea name="damageNote" /></Field></div><div className="md:col-span-2"><Btn>إنهاء وإصدار الفاتورة</Btn></div></form></Card>
      {Number(r.deposit) === 0 && <form action={cancelRental}><input type="hidden" name="id" value={id} /><Btn variant="danger">إلغاء العقد</Btn></form>}</>}</div>);
}

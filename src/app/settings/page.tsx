import { db, schema as s } from '@/db';
import { createBranch, createCategory, createTreasury, saveCompany, updateRate } from '@/lib/actions';
import { desc } from 'drizzle-orm';
import { Btn, Card, Input, PageHeader, Select } from '@/components/ui';
import { kinds, unitKinds } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Settings() {
  const cs = Object.fromEntries((await db.select().from(s.settings)).map((x) => [x.key, x.value]));
  const rateRows = await db.select().from(s.rates).orderBy(desc(s.rates.id)).limit(5);
  const [br, cats, tre] = await Promise.all([db.select().from(s.branches), db.select().from(s.categories), db.select().from(s.treasury)]);
  return (<div><PageHeader title="الإعدادات" /><div className="grid max-w-5xl gap-4 md:grid-cols-3">
    <Card><h2 className="mb-3 font-semibold">الفروع والأقسام</h2><form action={createBranch} className="mb-3 space-y-2"><Input name="name" required placeholder="اسم الفرع أو القسم" /><Select name="kind">{Object.entries(unitKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select><Btn>إضافة</Btn></form><p className="mb-2 text-xs text-gray-500">كل فرع/قسم له مخزونه وفواتيره وخزائنه وتقاريره ومستخدموه.</p><ul className="space-y-1 text-sm">{br.map((x) => <li key={x.id} className="rounded bg-gray-50 px-3 py-1.5">{x.name} <span className="text-xs text-gray-500">({unitKinds[x.kind]})</span></li>)}</ul></Card>
    <Card><h2 className="mb-3 font-semibold">فئات الأصناف</h2><form action={createCategory} className="mb-3 space-y-2"><Input name="name" required placeholder="اسم الفئة" /><Select name="kind">{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select><Btn>إضافة</Btn></form><ul className="space-y-1 text-sm">{cats.map((x) => <li key={x.id} className="rounded bg-gray-50 px-3 py-1.5">{kinds[x.kind]} · {x.name}</li>)}</ul></Card>
    <Card><h2 className="mb-3 font-semibold">الخزائن والحسابات البنكية</h2><form action={createTreasury} className="mb-3 space-y-2"><Input name="name" required placeholder="مثال: خزينة بورسودان" /><Select name="branchId"><option value="">كل الفروع</option>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select name="type"><option value="cash">نقدية</option><option value="bank">بنك</option></Select><Input name="openingBalance" type="number" step="0.01" placeholder="رصيد افتتاحي" /><Btn>إضافة</Btn></form><ul className="space-y-1 text-sm">{tre.map((x) => <li key={x.id} className="rounded bg-gray-50 px-3 py-1.5">{x.name}</li>)}</ul></Card></div>
    <Card className="mt-4 max-w-5xl"><h2 className="mb-1 font-semibold">سعر الصرف والتسعير بالدولار</h2><p className="mb-3 text-xs text-gray-500">الحالي: <b>{cs.usd_rate || 'غير محدد'}</b> — عند الحفظ تُعاد أسعار البيع المحلية لكل صنف له سعر دولار (سعر الدولار × السعر).</p>
      <form action={updateRate} className="mb-3 flex gap-2"><div className="w-44"><Input name="rate" type="number" step="0.0001" min="0.0001" placeholder="سعر الدولار اليوم" required /></div><Btn>حفظ وتحديث الأسعار</Btn></form>
      <ul className="space-y-1 text-xs text-gray-600">{rateRows.map((r) => <li key={r.id}>{new Date(r.at).toISOString().slice(0, 16).replace('T', ' ')} — {Number(r.rate)} — {r.userName ?? ''} — حُدّثت {r.updated} صنف</li>)}</ul></Card>
    <Card className="mt-4 max-w-5xl"><h2 className="mb-3 font-semibold">بيانات الشركة (رأسية الفواتير المطبوعة)</h2><form action={saveCompany} className="grid gap-3 md:grid-cols-2">
      <Input name="company_name" defaultValue={cs.company_name} placeholder="اسم الشركة" /><Input name="company_phone" defaultValue={cs.company_phone} placeholder="الهاتف" />
      <Input name="company_address" defaultValue={cs.company_address} placeholder="العنوان (بورسودان / الخرطوم)" /><Input name="company_footer" defaultValue={cs.company_footer} placeholder="تذييل الفاتورة (مثال: شكراً لتعاملكم معنا)" /><div><Btn>حفظ</Btn></div></form></Card></div>);
}

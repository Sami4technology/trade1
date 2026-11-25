import { visibleTreasuries } from '@/lib/branch';
import { db, schema as s } from '@/db';
import { createVoucher } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewVoucher({ searchParams }: { searchParams: Promise<{ direction?: string; partyId?: string; invoiceId?: string; back?: string }> }) {
  const q = await searchParams;
  const [parties, tre] = await Promise.all([db.select().from(s.parties).orderBy(s.parties.type, s.parties.name), visibleTreasuries()]);
  return (<div className="max-w-xl"><PageHeader title="سند قبض / صرف" /><Card><form action={createVoucher} className="space-y-4">
    <input type="hidden" name="invoiceId" value={q.invoiceId ?? ''} /><input type="hidden" name="back" value={q.back ?? '/accounts'} />
    <Field label="النوع"><Select name="direction" defaultValue={q.direction ?? 'in'}><option value="in">سند قبض (استلام من عميل)</option><option value="out">سند صرف (دفع لمورد)</option></Select></Field>
    <Field label="الطرف"><Select name="partyId" defaultValue={q.partyId ?? ''}><option value="">—</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.type === 'customer' ? 'عميل' : 'مورد'}: {p.name}</option>)}</Select></Field>
    <Field label="الخزينة / الحساب *"><Select name="treasuryId" required defaultValue=""><option value="" disabled>اختر</option>{tre.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
    <div className="grid grid-cols-2 gap-4"><Field label="المبلغ *"><Input name="amount" type="number" step="0.01" min="0.01" required /></Field><Field label="التاريخ"><Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field></div>
    <Field label="البيان"><Input name="note" /></Field>{q.invoiceId && <p className="text-xs text-gray-500">سيُسجَّل المبلغ على الفاتورة المحددة.</p>}<Btn>حفظ</Btn></form></Card></div>);
}

import { createParty } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export default async function NewParty({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = (await searchParams).type ?? 'customer';
  return (<div className="max-w-xl"><PageHeader title="عميل / مورد جديد" /><Card><form action={createParty} className="space-y-4">
    <Field label="النوع"><Select name="type" defaultValue={type}><option value="customer">عميل</option><option value="supplier">مورد</option></Select></Field>
    <Field label="الاسم *"><Input name="name" required /></Field><Field label="الهاتف"><Input name="phone" /></Field><Field label="العنوان"><Input name="address" /></Field>
    <Field label="رصيد افتتاحي (له/عليه لصالح الشركة أو المورد، موجب = مستحق)"><Input name="openingBalance" type="number" step="0.01" defaultValue="0" /></Field><Btn>حفظ</Btn></form></Card></div>);
}

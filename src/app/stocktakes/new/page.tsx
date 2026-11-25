import { allBranches, currentBranch } from '@/lib/branch';
import { createStocktake } from '@/lib/actions';
import { Btn, Card, Field, Input, PageHeader, Select } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function NewStocktake() {
  const [br, cb] = await Promise.all([allBranches(), currentBranch()]);
  return (<div className="max-w-xl"><PageHeader title="بدء جرد فعلي" /><Card><form action={createStocktake} className="space-y-4"><Field label="الفرع / القسم"><Select name="branchId" defaultValue={cb ?? br[0]?.id}>{br.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field><Field label="ملاحظات"><Input name="note" /></Field>
    <p className="text-sm text-gray-600">يُسجَّل رصيد النظام الحالي لكل الأصناف النشطة. أوقف الحركة على الفرع أثناء العدّ لأدق نتيجة.</p><Btn>بدء الجرد</Btn></form></Card></div>);
}

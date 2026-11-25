'use client';
import { setBranch } from '@/lib/actions';
export default function BranchSwitch({ branches, current }: { branches: { id: number; name: string }[]; current: string }) {
  return (<form action={setBranch}><select name="branch" defaultValue={current} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full rounded-lg bg-gray-800 px-2 py-1.5 text-sm text-white">
    <option value="all">كل الفروع والأقسام</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></form>);
}

import { db, schema as s } from '@/db';
export default async function InvoiceHeader({ title, number, branch }: { title: string; number: string; branch: string }) {
  const cs = Object.fromEntries((await db.select().from(s.settings)).map((x) => [x.key, x.value]));
  return (<div className="mb-4 flex items-start justify-between border-b-2 border-gray-800 pb-3">
    <div><div className="text-xl font-bold">{cs.company_name || 'اسم الشركة'}</div><div className="text-xs text-gray-600">{cs.company_address}{cs.company_phone ? ` · ${cs.company_phone}` : ''}</div></div>
    <div className="text-left text-sm"><div className="text-lg font-bold">{title}</div><div>{number}</div><div className="text-xs text-gray-600">فرع {branch}</div></div></div>);
}
export async function InvoiceFooter() { const cs = Object.fromEntries((await db.select().from(s.settings)).map((x) => [x.key, x.value])); return cs.company_footer ? <p className="mt-6 border-t pt-2 text-center text-xs text-gray-500">{cs.company_footer}</p> : null; }

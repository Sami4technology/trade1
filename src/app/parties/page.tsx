import Link from 'next/link';
import { PageHeader, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
import { partyBalances } from '@/lib/queries';
export const dynamic = 'force-dynamic';
export default async function Parties({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = (await searchParams).type === 'supplier' ? 'supplier' : 'customer';
  const rows = await partyBalances(type); const total = rows.reduce((a, x) => a + x.balance, 0);
  return (<div><PageHeader title={type === 'customer' ? 'العملاء' : 'الموردون'} action={{ href: `/parties/new?type=${type}`, label: '+ جديد' }} />
    <p className="mb-3 text-sm text-gray-600">{type === 'customer' ? 'إجمالي المستحق من العملاء' : 'إجمالي المستحق للموردين'}: <b>{fmt(total)}</b></p>
    <Table head={['الاسم', 'الهاتف', 'الرصيد']}>{rows.map((x) => <tr key={x.id}><Td><Link className="text-brand" href={`/parties/${x.id}`}>{x.name}</Link></Td><Td>{x.phone ?? '—'}</Td><Td className={x.balance > 0 ? 'font-semibold text-red-700' : ''}>{fmt(x.balance)}</Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا يوجد</Td><Td /><Td /></tr>}</Table></div>);
}

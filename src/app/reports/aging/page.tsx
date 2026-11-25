import Link from 'next/link';
import { aging } from '@/lib/queries';
import { PageHeader, Table, Td } from '@/components/ui';
import { fmt } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Aging({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = (await searchParams).type === 'supplier' ? 'supplier' : 'customer'; const rows = await aging(type); const t = (k: 'b0' | 'b31' | 'b61' | 'b90' | 'balance') => rows.reduce((a, x) => a + x[k], 0);
  return (<div className="max-w-5xl"><PageHeader title={type === 'customer' ? 'تقادم ديون العملاء' : 'تقادم مستحقات الموردين'} />
    <div className="mb-4 flex gap-2 text-sm">{[['customer', 'العملاء'], ['supplier', 'الموردون']].map(([k, l]) => <Link key={k} href={`/reports/aging?type=${k}`} className={`rounded-lg border px-3 py-1.5 ${type === k ? 'bg-brand text-white' : 'bg-white'}`}>{l}</Link>)}</div>
    <Table head={['الاسم', '0–30 يوم', '31–60', '61–90', 'أكثر من 90', 'الإجمالي']}>{rows.map((x) => <tr key={x.id}><Td><Link className="text-brand" href={`/parties/${x.id}`}>{x.name}</Link></Td><Td>{fmt(x.b0)}</Td><Td>{fmt(x.b31)}</Td><Td>{fmt(x.b61)}</Td><Td className={x.b90 > 0 ? 'font-semibold text-red-600' : ''}>{fmt(x.b90)}</Td><Td className="font-semibold">{fmt(x.balance)}</Td></tr>)}
      {rows.length > 0 && <tr className="border-t-2 bg-gray-50 font-bold"><Td>الإجمالي</Td><Td>{fmt(t('b0'))}</Td><Td>{fmt(t('b31'))}</Td><Td>{fmt(t('b61'))}</Td><Td>{fmt(t('b90'))}</Td><Td>{fmt(t('balance'))}</Td></tr>}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد أرصدة مستحقة</Td>{[1, 2, 3, 4, 5].map((i) => <Td key={i} />)}</tr>}</Table>
    <p className="mt-3 text-xs text-gray-500">يُفترض أن الدفعات تسدّد أقدم الفواتير أولاً؛ والرصيد الافتتاحي يُحتسب ضمن «أكثر من 90».</p></div>);
}

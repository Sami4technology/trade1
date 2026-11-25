import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { Badge, PageHeader, Table, Td } from '@/components/ui';
import { fmt, fmtDate, jobKinds, jobStatus } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function Jobs() {
  const b = await currentBranch();
  const rows = await db.select({ j: s.jobs, p: s.parties.name, br: s.branches.name }).from(s.jobs).innerJoin(s.parties, eq(s.parties.id, s.jobs.partyId)).innerJoin(s.branches, eq(s.branches.id, s.jobs.branchId)).where(b ? eq(s.jobs.branchId, b) : undefined).orderBy(desc(s.jobs.id)).limit(200);
  return (<div><PageHeader title="صيانة الجملونات والهناجر" action={{ href: '/jobs/new', label: '+ أمر خدمة / عرض سعر' }} />
    <Table head={['الرقم', 'العميل', 'النوع', 'العنوان', 'الفرع', 'القيمة', 'الحالة']}>{rows.map(({ j, p, br }) => <tr key={j.id}><Td><Link className="font-medium text-brand" href={`/jobs/${j.id}`}>{j.number}</Link></Td><Td>{p}</Td><Td>{jobKinds[j.kind]}</Td><Td>{j.title}</Td><Td>{br}</Td><Td>{fmt(j.quoteAmount)}</Td><Td><Badge cls={jobStatus[j.status].cls}>{jobStatus[j.status].label}</Badge></Td></tr>)}
      {!rows.length && <tr><Td className="text-gray-400">لا توجد أوامر</Td>{[1, 2, 3, 4, 5, 6].map((i) => <Td key={i} />)}</tr>}</Table></div>);
}

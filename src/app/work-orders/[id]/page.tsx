import { canAccess } from '@/lib/branch';
import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db, schema as s } from '@/db';
import { addWorkOrderPart, assignTechnician, cancelWorkOrder, completeWorkOrder, removeWorkOrderPart, startWorkOrder } from '@/lib/actions';
import { Badge, Btn, Card, Field, Input, PageHeader, Select, Table, Td, Textarea } from '@/components/ui';
import { fmt, fmtDate, priority, woStatus, woType } from '@/lib/labels';
export const dynamic = 'force-dynamic';
export default async function WODetail({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10); if (isNaN(id)) notFound();
  const [row] = await db.select({ w: s.workOrders, e: s.assets, b: s.branches.name }).from(s.workOrders).innerJoin(s.assets, eq(s.assets.id, s.workOrders.assetId)).innerJoin(s.branches, eq(s.branches.id, s.workOrders.branchId)).where(eq(s.workOrders.id, id)); if (!row) notFound(); const { w, e } = row; if (!(await canAccess(w.branchId))) notFound();
  const [techs, avail, used] = await Promise.all([db.select().from(s.technicians).where(eq(s.technicians.active, true)),
    db.execute(sql`select p.id, p.code, p.name, p.unit, coalesce(st.qty,0)::float as qty from products p left join stock st on st.product_id=p.id and st.branch_id=${w.branchId} where p.active order by p.code`),
    db.select({ u: s.workOrderParts, p: s.products }).from(s.workOrderParts).innerJoin(s.products, eq(s.products.id, s.workOrderParts.productId)).where(eq(s.workOrderParts.workOrderId, id))]);
  const closed = w.status === 'done' || w.status === 'cancelled'; const partsTotal = used.reduce((a, { u }) => a + Number(u.qty) * Number(u.unitCost), 0);
  return (<div className="max-w-4xl"><PageHeader title={`${w.number} — ${w.title}`} />
    <div className="mb-5 grid gap-4 md:grid-cols-3"><Card className="md:col-span-2"><dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-gray-500">المعدة</dt><dd><Link className="font-medium text-brand" href={`/assets/${e.id}`}>{e.code} — {e.name}</Link></dd></div><div><dt className="text-gray-500">الحالة</dt><dd><Badge cls={woStatus[w.status].cls}>{woStatus[w.status].label}</Badge></dd></div>
      <div><dt className="text-gray-500">النوع</dt><dd>{woType[w.type]}</dd></div><div><dt className="text-gray-500">الأولوية</dt><dd><Badge cls={priority[w.priority].cls}>{priority[w.priority].label}</Badge></dd></div>
      <div><dt className="text-gray-500">الفرع / القسم</dt><dd>{row.b}</dd></div><div><dt className="text-gray-500">البلاغ / الإنجاز</dt><dd>{fmtDate(w.reportedAt)} / {fmtDate(w.completedAt)}</dd></div></dl>
      {w.description && <p className="mt-3 border-t pt-3 text-sm text-gray-700">{w.description}</p>}{w.resolution && <p className="mt-3 border-t pt-3 text-sm"><b>الإجراء المتخذ: </b>{w.resolution}</p>}</Card>
      <Card className="space-y-3"><form action={assignTechnician} className="flex gap-2"><input type="hidden" name="id" value={id} /><Select name="technicianId" defaultValue={w.technicianId ?? ''} disabled={closed}><option value="">— الفني —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>{!closed && <Btn variant="ghost">حفظ</Btn>}</form>
        {w.status === 'open' && <form action={startWorkOrder}><input type="hidden" name="id" value={id} /><Btn>بدء التنفيذ</Btn></form>}{!closed && <form action={cancelWorkOrder}><input type="hidden" name="id" value={id} /><Btn variant="danger">إلغاء الأمر</Btn></form>}</Card></div>
    <h2 className="mb-2 font-semibold">قطع الغيار المصروفة من مخزن {row.b}</h2>
    <div className="mb-3"><Table head={['الصنف', 'الكمية', 'التكلفة', 'الإجمالي', '']}>{used.map(({ u, p }) => <tr key={u.id}><Td>{p.code} — {p.name}</Td><Td>{fmt(u.qty)} {p.unit}</Td><Td>{fmt(u.unitCost)}</Td><Td>{fmt(Number(u.qty) * Number(u.unitCost))}</Td><Td>{!closed && <form action={removeWorkOrderPart}><input type="hidden" name="id" value={u.id} /><button className="text-xs text-red-600">إرجاع للمخزن</button></form>}</Td></tr>)}
      {!used.length && <tr><Td className="text-gray-400">لم تُصرف قطع</Td><Td /><Td /><Td /><Td /></tr>}{!!used.length && <tr className="bg-gray-50 font-semibold"><Td>الإجمالي</Td><Td /><Td /><Td>{fmt(partsTotal)}</Td><Td /></tr>}</Table></div>
    {!closed && <Card className="mb-6"><form action={addWorkOrderPart} className="flex flex-wrap items-end gap-3"><input type="hidden" name="workOrderId" value={id} /><div className="min-w-56 flex-1"><Field label="الصنف"><Select name="productId" required defaultValue=""><option value="" disabled>اختر</option>{(avail.rows as { id: number; code: string; name: string; qty: number; unit: string }[]).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} (متاح {fmt(p.qty)} {p.unit})</option>)}</Select></Field></div><div className="w-28"><Field label="الكمية"><Input name="qty" type="number" step="0.001" min="0.001" required /></Field></div><Btn>صرف من المخزن</Btn></form></Card>}
    {!closed && <><h2 className="mb-2 font-semibold">إغلاق الأمر</h2><Card><form action={completeWorkOrder} className="grid gap-4 md:grid-cols-3"><input type="hidden" name="id" value={id} /><Field label="ساعات العمل"><Input name="laborHours" type="number" step="0.1" min="0" defaultValue="0" /></Field><Field label="تكلفة العمالة"><Input name="laborCost" type="number" step="0.01" min="0" defaultValue="0" /></Field><Field label="ساعات توقف المعدة"><Input name="downtimeHours" type="number" step="0.1" min="0" defaultValue="0" /></Field>
      <div className="md:col-span-3"><Field label="الإجراء المتخذ"><Textarea name="resolution" /></Field></div><div className="md:col-span-3"><Btn>إنجاز الأمر</Btn></div></form></Card></>}
    {w.status === 'done' && <Card className="text-sm">ساعات العمل: <b>{fmt(w.laborHours)}</b> · العمالة: <b>{fmt(w.laborCost)}</b> · توقف: <b>{fmt(w.downtimeHours)}</b> ساعة · إجمالي التكلفة: <b>{fmt(partsTotal + Number(w.laborCost))}</b></Card>}</div>);
}

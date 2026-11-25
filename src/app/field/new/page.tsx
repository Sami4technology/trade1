import { and, eq, ne } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { currentBranch } from '@/lib/branch';
import { createWorkOrder } from '@/lib/actions';
import { Field, Input, Select, Textarea } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function FieldNew() {
  const b = await currentBranch(); const assets = await db.select().from(s.assets).where(b ? and(eq(s.assets.branchId, b), ne(s.assets.status, 'rented')) : ne(s.assets.status, 'rented')).orderBy(s.assets.code);
  return (<div className="mx-auto max-w-md"><h1 className="mb-3 text-xl font-bold">بلاغ عطل</h1>
    <form action={createWorkOrder} className="space-y-4 rounded-xl border bg-white p-4"><Field label="المعدة *"><Select name="assetId" required>{assets.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</Select></Field>
      <Field label="ما المشكلة؟ *"><Input name="title" required /></Field><Field label="تفاصيل"><Textarea name="description" /></Field>
      <Field label="النوع"><Select name="type" defaultValue="corrective"><option value="corrective">علاجية (عطل)</option><option value="emergency">طارئة (المعدة توقفت)</option></Select></Field>
      <Field label="الأولوية"><Select name="priority" defaultValue="medium"><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option></Select></Field>
      <button className="w-full rounded-xl bg-red-600 py-4 text-lg font-bold text-white">إرسال البلاغ</button></form></div>);
}

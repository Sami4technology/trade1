'use client';
import { useState } from 'react';
type P = { id: number; code: string; name: string; price: number };
type Row = { productId: string; description: string; qty: string; price: string };
export default function QuoteLines({ products }: { products: P[] }) {
  const [rows, setRows] = useState<Row[]>([{ productId: '', description: '', qty: '1', price: '' }]);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, id: string) => { const p = products.find((x) => String(x.id) === id); set(i, p ? { productId: id, description: p.name, price: String(p.price) } : { productId: '' }); };
  const total = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  const json = JSON.stringify(rows.map((r) => ({ productId: r.productId ? Number(r.productId) : null, description: r.description, qty: Number(r.qty), price: Number(r.price) })));
  const cls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm';
  return (<div><input type="hidden" name="items" value={json} />
    <table className="w-full text-sm"><thead><tr className="text-right text-gray-600"><th className="p-1 w-48">صنف من المخزون (اختياري)</th><th className="p-1">البيان</th><th className="p-1 w-20">الكمية</th><th className="p-1 w-28">السعر</th><th className="p-1 w-24">الإجمالي</th><th className="w-8" /></tr></thead>
      <tbody>{rows.map((r, i) => (<tr key={i}><td className="p-1"><select className={cls + ' w-full'} value={r.productId} onChange={(e) => pick(i, e.target.value)}><option value="">بند حر (خدمة/عمالة)</option>{products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></td>
        <td className="p-1"><input className={cls + ' w-full'} value={r.description} onChange={(e) => set(i, { description: e.target.value })} required /></td>
        <td className="p-1"><input className={cls + ' w-full'} type="number" step="0.001" min="0.001" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} /></td>
        <td className="p-1"><input className={cls + ' w-full'} type="number" step="0.01" min="0" value={r.price} onChange={(e) => set(i, { price: e.target.value })} required /></td>
        <td className="p-1">{((Number(r.qty) || 0) * (Number(r.price) || 0)).toLocaleString('en-US')}</td>
        <td className="p-1">{rows.length > 1 && <button type="button" className="text-red-600" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>✕</button>}</td></tr>))}</tbody></table>
    <div className="mt-2 flex items-center justify-between"><button type="button" className="text-sm text-brand" onClick={() => setRows((r) => [...r, { productId: '', description: '', qty: '1', price: '' }])}>+ إضافة بند</button><b>المجموع: {total.toLocaleString('en-US')}</b></div></div>);
}

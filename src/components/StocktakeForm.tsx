'use client';
import { useCallback, useRef, useState } from 'react';
import CameraScan from './CameraScan';
import { postStocktake, saveStocktake } from '@/lib/actions';
type R = { productId: number; code: string; name: string; unit: string; barcode: string | null; system: number; counted: string };
export default function StocktakeForm({ id, rows }: { id: number; rows: R[] }) {
  const [c, setC] = useState<Record<number, string>>(Object.fromEntries(rows.map((r) => [r.productId, r.counted])));
  const [scan, setScan] = useState(''); const [msg, setMsg] = useState(''); const [q, setQ] = useState(''); const [onlyDiff, setOnlyDiff] = useState(false);
  const refs = useRef<Record<number, HTMLInputElement | null>>({});
  const handle = (raw: string) => { const v = raw.trim(); if (!v) return; const r = rows.find((x) => x.barcode === v || x.code.toLowerCase() === v.toLowerCase()); if (!r) { setMsg(`غير موجود: ${v}`); setScan(''); return; } setMsg(`${r.name} ← ${(Number(c[r.productId] || 0) + 1)}`); setC((o) => ({ ...o, [r.productId]: String((Number(o[r.productId]) || 0) + 1) })); setScan(''); };
  const onScan = () => handle(scan); const hRef = useRef(handle); hRef.current = handle; const cam = useCallback((v: string) => hRef.current(v), []);
  const counted = rows.filter((r) => c[r.productId] !== '' && c[r.productId] !== undefined); const diffs = counted.filter((r) => Number(c[r.productId]) !== r.system);
  const shown = rows.filter((r) => (!q || r.name.includes(q) || r.code.toLowerCase().includes(q.toLowerCase())) && (!onlyDiff || (c[r.productId] !== '' && Number(c[r.productId]) !== r.system)));
  const json = JSON.stringify(c); const cls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm';
  return (<form className="space-y-3"><input type="hidden" name="id" value={id} /><input type="hidden" name="counts" value={json} />
    <div className="flex flex-wrap items-end gap-3"><div><div className="mb-1 text-xs text-gray-500">مسح باركود (كل مسحة = +1)</div><input className={cls + ' w-56'} value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onScan(); } }} placeholder="🔍 باركود" /></div><CameraScan onScan={cam} />
      <div><div className="mb-1 text-xs text-gray-500">بحث</div><input className={cls} value={q} onChange={(e) => setQ(e.target.value)} /></div><label className="flex items-center gap-1 pb-2 text-sm"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> الفروقات فقط</label>
      <span className="pb-2 text-sm text-gray-600">تم جرد {counted.length} من {rows.length} · فروقات: <b className={diffs.length ? 'text-red-600' : ''}>{diffs.length}</b></span>{msg && <span className="pb-2 text-sm text-green-700">{msg}</span>}</div>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50 text-right text-gray-600"><tr><th className="px-3 py-2">الكود</th><th className="px-3 py-2">الصنف</th><th className="px-3 py-2">بالنظام</th><th className="px-3 py-2 w-32">الفعلي</th><th className="px-3 py-2">الفرق</th></tr></thead>
      <tbody>{shown.map((r) => { const v = c[r.productId]; const d = v === '' || v === undefined ? null : Number(v) - r.system; return (<tr key={r.productId} className="border-t"><td className="px-3 py-1.5">{r.code}</td><td className="px-3 py-1.5">{r.name} <span className="text-xs text-gray-400">({r.unit})</span></td><td className="px-3 py-1.5">{r.system}</td>
        <td className="px-3 py-1.5"><input ref={(el) => { refs.current[r.productId] = el; }} className={cls + ' w-28'} type="number" step="0.001" min="0" value={v ?? ''} onChange={(e) => setC((o) => ({ ...o, [r.productId]: e.target.value }))} /></td>
        <td className={`px-3 py-1.5 font-semibold ${d === null ? 'text-gray-300' : d === 0 ? 'text-green-700' : 'text-red-600'}`}>{d === null ? '—' : d > 0 ? `+${d}` : d}</td></tr>); })}</tbody></table></div>
    <div className="flex gap-3"><button formAction={saveStocktake} className="rounded-lg border border-brand bg-white px-4 py-2 text-sm text-brand">حفظ مؤقت</button>
      <button formAction={postStocktake} className="rounded-lg bg-brand px-4 py-2 text-sm text-white" onClick={(e) => { if (!confirm(`اعتماد الجرد وتسوية ${diffs.length} صنف؟ لا يمكن التراجع.`)) e.preventDefault(); }}>اعتماد وتسوية المخزون</button></div>
    <p className="text-xs text-gray-500">الأصناف التي لم تُجرد (فارغة) لا تُسوّى. الفرق يُحسب مقابل الكمية وقت بدء الجرد.</p></form>);
}

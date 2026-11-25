'use client';
import { useCallback, useRef, useState } from 'react';
import CameraScan from './CameraScan';
type P = { id: number; code: string; name: string; unit: string; price: number; cost: number; usd?: number; barcode?: string | null };
type Row = { productId: string; qty: string; price: string };
export default function LineItems({ products, mode, rate }: { products: P[]; mode: 'sale' | 'purchase' | 'transfer'; rate?: number }) {
  const [rows, setRows] = useState<Row[]>([{ productId: '', qty: '1', price: '' }]);
  const [cur, setCur] = useState<'SDG' | 'USD'>('SDG'); const [fx, setFx] = useState(String(rate ?? ''));
  const [scan, setScan] = useState(''); const [msg, setMsg] = useState('');
  const f = Number(fx) || 0;
  const def = (p: P, c: 'SDG' | 'USD', r = f) => { const base = mode === 'sale' ? p.price : p.cost; if (c === 'SDG') return String(base); if (mode === 'sale' && p.usd) return String(p.usd); return r > 0 ? String(Math.round((base / r) * 100) / 100) : ''; };
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, id: string) => { const p = products.find((x) => String(x.id) === id); set(i, { productId: id, price: p ? def(p, cur) : '' }); };
  const changeCur = (c: 'SDG' | 'USD') => { setCur(c); setRows((r) => r.map((x) => { const p = products.find((y) => String(y.id) === x.productId); return p ? { ...x, price: def(p, c) } : x; })); };
  const handle = (raw: string) => {
    const v = raw.trim(); if (!v) return; const p = products.find((x) => x.barcode === v || x.code.toLowerCase() === v.toLowerCase());
    if (!p) { setMsg(`لا يوجد صنف بالباركود/الكود: ${v}`); setScan(''); return; } setMsg('');
    setRows((r) => { const k = r.findIndex((x) => x.productId === String(p.id)); if (k >= 0) return r.map((x, j) => (j === k ? { ...x, qty: String((Number(x.qty) || 0) + 1) } : x)); const e = r.findIndex((x) => !x.productId); const nr = { productId: String(p.id), qty: '1', price: def(p, cur) }; return e >= 0 ? r.map((x, j) => (j === e ? nr : x)) : [...r, nr]; });
    setScan('');
  };
  const onScan = () => handle(scan); const hRef = useRef(handle); hRef.current = handle; const cam = useCallback((v: string) => hRef.current(v), []);
  const total = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  const json = JSON.stringify(rows.map((r) => ({ productId: Number(r.productId), qty: Number(r.qty), price: mode === 'transfer' ? 0 : Number(r.price) })));
  const cls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm';
  const costOf = (id: string) => products.find((x) => String(x.id) === id)?.cost ?? 0;
  return (
    <div>
      <input type="hidden" name="items" value={json} />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div><div className="mb-1 text-xs text-gray-500">مسح باركود / كود الصنف ثم Enter</div><input className={cls + ' w-56'} value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onScan(); } }} placeholder="🔍 باركود" /></div><CameraScan onScan={cam} />
        {rate !== undefined && mode !== 'transfer' && <><div><div className="mb-1 text-xs text-gray-500">عملة الفاتورة</div><select name="currency" className={cls} value={cur} onChange={(e) => changeCur(e.target.value as 'SDG' | 'USD')}><option value="SDG">محلي</option><option value="USD">دولار</option></select></div>
          {cur === 'USD' && <div><div className="mb-1 text-xs text-gray-500">سعر الصرف</div><input name="fxRate" type="number" step="0.01" min="0" className={cls + ' w-28'} value={fx} onChange={(e) => setFx(e.target.value)} /></div>}</>}
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
      {cur === 'USD' && <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">الأسعار والخصم والمدفوع في هذه الفاتورة تُدخل بالدولار، وتُسجَّل بالمحلي حسب سعر الصرف أعلاه.</p>}
      <div className="space-y-3 text-sm">
        <div className="hidden grid-cols-[1fr_6rem_8rem_7rem_2rem] gap-2 text-right text-gray-600 md:grid"><span>الصنف</span><span>الكمية</span>{mode !== 'transfer' ? <span>{mode === 'sale' ? 'سعر البيع' : 'سعر الشراء'}{cur === 'USD' ? ' ($)' : ''}</span> : <span />}{mode !== 'transfer' ? <span>الإجمالي</span> : <span />}<span /></div>
        {rows.map((r, i) => (
          <div key={i} className={`grid grid-cols-2 items-center gap-2 rounded-lg border bg-gray-50 p-2 md:border-0 md:bg-transparent md:p-0 ${mode === 'transfer' ? 'md:grid-cols-[1fr_6rem_2rem]' : 'md:grid-cols-[1fr_6rem_8rem_7rem_2rem]'}`}>
            <select className={cls + ' col-span-2 w-full md:col-span-1'} value={r.productId} onChange={(e) => pick(i, e.target.value)} required><option value="">اختر الصنف</option>{products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} ({p.unit})</option>)}</select>
            <label className="text-xs text-gray-500 md:hidden">الكمية<input className={cls + ' mt-0.5 w-full text-sm text-gray-900'} type="number" step="0.001" min="0.001" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} /></label>
            <input className={cls + ' hidden w-full md:block'} type="number" step="0.001" min="0.001" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} />
            {mode !== 'transfer' && <><label className="text-xs text-gray-500 md:hidden">السعر{cur === 'USD' ? ' ($)' : ''}<input className={cls + ' mt-0.5 w-full text-sm text-gray-900' + (mode === 'sale' && r.productId && Number(r.price) * (cur === 'USD' ? f : 1) < costOf(r.productId) ? ' border-red-500 bg-red-50' : '')} type="number" step="0.01" min="0" value={r.price} onChange={(e) => set(i, { price: e.target.value })} /></label>
              <input className={cls + ' hidden w-full md:block' + (mode === 'sale' && r.productId && Number(r.price) * (cur === 'USD' ? f : 1) < costOf(r.productId) ? ' border-red-500 bg-red-50' : '')} type="number" step="0.01" min="0" value={r.price} onChange={(e) => set(i, { price: e.target.value })} />
              <div className="text-gray-700">{((Number(r.qty) || 0) * (Number(r.price) || 0)).toLocaleString('en-US')}</div></>}
            <div className="text-left md:text-center">{rows.length > 1 && <button type="button" className="text-red-600" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>✕ حذف</button>}</div></div>))}
      </div>
      <div className="mt-2 flex items-center justify-between"><button type="button" className="text-sm text-brand" onClick={() => setRows((r) => [...r, { productId: '', qty: '1', price: '' }])}>+ إضافة صنف</button>
        {mode !== 'transfer' && <b>الإجمالي: {total.toLocaleString('en-US')} {cur === 'USD' ? '$' : ''}</b>}</div>
    </div>
  );
}

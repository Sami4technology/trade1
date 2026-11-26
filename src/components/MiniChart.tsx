import { fmt } from '@/lib/labels';
export function Spark({ data, color = '#1d4ed8' }: { data: number[]; color?: string }) {
  const max = Math.max(1, ...data), W = 120, H = 36, st = W / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * st, H - 3 - (v / max) * (H - 8)] as const); const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const id = 'sp' + color.slice(1);
  return (<svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden><defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} /><path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>);
}
function smooth(p: readonly (readonly [number, number])[]) {
  return p.map(([x, y], i) => { if (!i) return `M${x} ${y}`; const [px, py] = p[i - 1]; const cx = (px + x) / 2; return `C${cx} ${py} ${cx} ${y} ${x} ${y}`; }).join(' ');
}
export default function MiniChart({ data }: { data: { label: string; a: number; b: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b])) * 1.1, W = 560, H = 190, pad = 24, st = (W - pad * 2) / Math.max(1, data.length - 1);
  const X = (i: number) => +(pad + i * st).toFixed(1), Y = (v: number) => +(H - (v / max) * (H - 16)).toFixed(1);
  const pa = data.map((d, i) => [X(i), Y(d.a)] as const), pb = data.map((d, i) => [X(i), Y(d.b)] as const);
  return (<div><svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" role="img" aria-label="المبيعات مقابل المصروفات">
    <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1d4ed8" stopOpacity=".28" /><stop offset="1" stopColor="#1d4ed8" stopOpacity="0" /></linearGradient></defs>
    {[0, 0.5, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={H - t * (H - 16)} y2={H - t * (H - 16)} stroke="#e5e7eb" strokeDasharray="3 4" />)}
    <path d={`${smooth(pa)} L${pa[pa.length - 1][0]} ${H} L${pa[0][0]} ${H} Z`} fill="url(#ga)" />
    <path d={smooth(pa)} fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
    <path d={smooth(pb)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
    {data.map((d, i) => <g key={i}><circle cx={X(i)} cy={Y(d.a)} r="4.5" fill="#fff" stroke="#1d4ed8" strokeWidth="2.5"><title>{`مبيعات ${d.label}: ${fmt(d.a)}`}</title></circle>
      <circle cx={X(i)} cy={Y(d.b)} r="3.5" fill="#fff" stroke="#f59e0b" strokeWidth="2"><title>{`مصروفات ${d.label}: ${fmt(d.b)}`}</title></circle>
      <text x={X(i)} y={H + 18} textAnchor="middle" fontSize="12" fill="#6b7280">{d.label}</text></g>)}
  </svg><div className="mt-1 flex gap-4 text-xs text-gray-600"><span><i className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-brand" />المبيعات</span><span><i className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />المصروفات</span></div></div>);
}

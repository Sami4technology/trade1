import Link from 'next/link';
import { ReactNode } from 'react';
export function Badge({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
export function PageHeader({ title, action }: { title: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {action && <Link href={action.href} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">{action.label}</Link>}
    </div>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-right text-gray-600"><tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-gray-700">{label}</span>{children}</label>;
}
export const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={inputCls} />;
export const Select = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={inputCls}>{children}</select>;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={inputCls} />;
export const Btn = ({ children, variant = 'primary', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) => (
  <button {...p} className={`rounded-lg px-4 py-2 text-sm font-medium ${variant === 'primary' ? 'bg-brand text-white hover:bg-brand-dark' : variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>{children}</button>
);

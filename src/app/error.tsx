'use client';
export default function Err({ error, reset }: { error: Error; reset: () => void }) {
  return (<div className="mx-auto mt-20 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center"><p className="mb-4 text-red-800">{error.message && !error.message.includes('Server Components') ? error.message : 'حدث خطأ، تحقق من البيانات وحاول مرة أخرى'}</p>
    <button onClick={() => history.back()} className="rounded-lg bg-white px-4 py-2 text-sm shadow">رجوع</button> <button onClick={reset} className="rounded-lg bg-white px-4 py-2 text-sm shadow">إعادة المحاولة</button></div>);
}

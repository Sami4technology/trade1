'use client';
import { useEffect, useRef, useState } from 'react';
export default function CameraScan({ onScan }: { onScan: (v: string) => void }) {
  const [open, setOpen] = useState(false); const [err, setErr] = useState(''); const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!open) return; let stop = () => {}; let dead = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser'); const reader = new BrowserMultiFormatReader();
        const ctl = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (res) => { if (res && !dead) { dead = true; onScan(res.getText()); setOpen(false); } });
        stop = () => ctl.stop(); if (dead) stop();
      } catch { setErr('تعذّر تشغيل الكاميرا. تأكد من السماح بالوصول وأن الموقع يعمل عبر HTTPS.'); }
    })();
    return () => { dead = true; stop(); };
  }, [open, onScan]);
  return (<>
    <button type="button" onClick={() => { setErr(''); setOpen(true); }} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm" title="مسح بالكاميرا">📷 كاميرا</button>
    {open && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"><video ref={video} className="max-h-[70vh] w-full max-w-md rounded-lg" muted playsInline />
      <p className="mt-3 text-sm text-white">{err || 'وجّه الكاميرا نحو الباركود'}</p><button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-lg bg-white px-6 py-2 text-sm font-semibold">إغلاق</button></div>}
  </>);
}

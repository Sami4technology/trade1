'use client';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
export default function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => { if (ref.current) { try { JsBarcode(ref.current, value, { format: 'CODE128', height: 40, width: 1.6, fontSize: 12, margin: 2, displayValue: true }); } catch { /* قيمة غير مدعومة */ } } }, [value]);
  return <svg ref={ref} />;
}

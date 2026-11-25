export const fmt = (n: string | number | null | undefined) => Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const fmtDate = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
export const kinds: Record<string, string> = { equipment: 'معدات', safety: 'أدوات سلامة', iron: 'حديد', material: 'مواد صيانة' };
export const jobKinds: Record<string, string> = { gable: 'صيانة جملون', hangar: 'صيانة هنقر', other: 'أخرى' };
export const jobStatus: Record<string, { label: string; cls: string }> = {
  quote: { label: 'عرض سعر', cls: 'bg-gray-100 text-gray-700' }, approved: { label: 'معتمد', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'قيد التنفيذ', cls: 'bg-amber-100 text-amber-800' }, done: { label: 'منجز', cls: 'bg-green-100 text-green-800' },
  invoiced: { label: 'مفوتر', cls: 'bg-emerald-100 text-emerald-800' }, cancelled: { label: 'ملغي', cls: 'bg-red-100 text-red-800' },
};
export const expenseCats = ['رواتب وأجور', 'إيجار', 'كهرباء ومياه', 'نقل وشحن', 'وقود', 'صيانة', 'اتصالات', 'مصروفات إدارية', 'أخرى'];
export const unitKinds: Record<string, string> = { branch: 'فرع', department: 'قسم مستقل' };
export const reportKinds: Record<string, string> = { ...kinds, rental: 'تأجير معدات', job: 'صيانة جملونات وهناجر', service: 'خدمات أخرى' };
export const assetStatus: Record<string, { label: string; cls: string }> = { rented: { label: 'مؤجرة', cls: 'bg-purple-100 text-purple-800' }, running: { label: 'يعمل', cls: 'bg-green-100 text-green-800' }, stopped: { label: 'متوقف', cls: 'bg-red-100 text-red-800' }, maintenance: { label: 'تحت الصيانة', cls: 'bg-amber-100 text-amber-800' }, retired: { label: 'مستبعد', cls: 'bg-gray-200 text-gray-700' } };
export const woStatus: Record<string, { label: string; cls: string }> = { open: { label: 'مفتوح', cls: 'bg-blue-100 text-blue-800' }, in_progress: { label: 'قيد التنفيذ', cls: 'bg-amber-100 text-amber-800' }, done: { label: 'مكتمل', cls: 'bg-green-100 text-green-800' }, cancelled: { label: 'ملغي', cls: 'bg-gray-200 text-gray-700' } };
export const woType: Record<string, string> = { preventive: 'وقائية', corrective: 'علاجية', emergency: 'طارئة' };
export const priority: Record<string, { label: string; cls: string }> = { low: { label: 'منخفضة', cls: 'bg-gray-100 text-gray-700' }, medium: { label: 'متوسطة', cls: 'bg-blue-100 text-blue-800' }, high: { label: 'عالية', cls: 'bg-red-100 text-red-800' } };
export const criticality: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'حرجة' };
export const qSt: Record<string, { label: string; cls: string }> = { open: { label: 'مفتوح', cls: 'bg-blue-100 text-blue-800' }, converted: { label: 'حُوّل لفاتورة', cls: 'bg-green-100 text-green-800' }, rejected: { label: 'مرفوض', cls: 'bg-gray-100 text-gray-600' } };
export const chqSt: Record<string, { label: string; cls: string }> = { pending: { label: 'معلّق', cls: 'bg-amber-100 text-amber-800' }, cleared: { label: 'تم', cls: 'bg-green-100 text-green-800' }, bounced: { label: 'مرتد', cls: 'bg-red-100 text-red-800' } };

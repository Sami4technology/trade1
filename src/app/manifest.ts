import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'نظام المبيعات والمخزون', short_name: 'المبيعات', description: 'المبيعات والمشتريات والمخزون وصيانة وتأجير المعدات', start_url: '/', display: 'standalone', dir: 'rtl', lang: 'ar', background_color: '#ffffff', theme_color: '#0f4c81',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] };
}

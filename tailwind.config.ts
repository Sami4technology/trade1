import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: { DEFAULT: '#1d4ed8', dark: '#1e40af', soft: '#eff6ff' } } } }, plugins: [] } satisfies Config;

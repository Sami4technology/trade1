import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashPassword(p: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(p, salt, 64).toString('hex')}`; }
export function checkPassword(p: string, h: string) { const [salt, hex] = h.split(':'); const a = Buffer.from(hex, 'hex'), b = scryptSync(p, salt, 64); return a.length === b.length && timingSafeEqual(a, b); }

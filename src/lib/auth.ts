// Edge-safe session token: base64url(payload).hmac
export type Sess = { uid: number; role: 'admin' | 'branch'; branchId: number | null };
const secret = () => (process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev') + ':trade-system';
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))));
}
export async function signSession(s: Sess) {
  const payload = b64(new TextEncoder().encode(JSON.stringify({ ...s, exp: Date.now() + 14 * 864e5 })));
  return `${payload}.${await hmac(payload)}`;
}
export async function verifySession(token?: string | null): Promise<Sess | null> {
  if (!token) return null; const [p, sig] = token.split('.'); if (!p || !sig || (await hmac(p)) !== sig) return null;
  try { const j = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))); return j.exp > Date.now() ? { uid: j.uid, role: j.role, branchId: j.branchId } : null; } catch { return null; }
}

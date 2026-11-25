import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
const adminOnly = ['/settings', '/users', '/reports', '/audit'];
export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname; if (p.startsWith('/login')) return NextResponse.next();
  const s = await verifySession(req.cookies.get('eq_session')?.value);
  if (!s) return NextResponse.redirect(new URL('/login', req.url));
  if (s.role !== 'admin' && adminOnly.some((x) => p.startsWith(x))) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next|favicon.ico|manifest.webmanifest|sw.js|icon-).*)'] };

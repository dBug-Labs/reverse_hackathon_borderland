import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Next.js 16 proxy (replaces deprecated middleware.ts).
 *
 * Guards admin and attendance areas:
 * - /admin/* and /api/admin/* need a valid bnd_admin cookie with scope=admin
 * - /attendance/* and /api/attendance/* need a valid bnd_attendance cookie with scope=attendance
 * - Login pages are excluded from the guard
 *
 * NOTE: This is a convenience layer only. Every route handler must
 * independently call requireScope() — middleware is not the security boundary.
 */

async function getScope(token: string | undefined, secret: Uint8Array): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).scope ?? null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // SESSION_SECRET may not be available during build — skip if missing
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return NextResponse.next();

  const secret = new TextEncoder().encode(sessionSecret);

  // ── Admin area guard ────────────────────────────────────────────
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/api/admin/login')
  ) {
    const token = req.cookies.get('bnd_admin')?.value;
    const scope = await getScope(token, secret);

    if (scope !== 'admin') {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // ── Attendance area guard ───────────────────────────────────────
  if (
    (pathname.startsWith('/attendance') || pathname.startsWith('/api/attendance')) &&
    !pathname.startsWith('/attendance/login') &&
    !pathname.startsWith('/api/attendance/login')
  ) {
    const token = req.cookies.get('bnd_attendance')?.value;
    const scope = await getScope(token, secret);

    if (scope !== 'attendance') {
      if (pathname.startsWith('/api/attendance')) {
        return NextResponse.json(
          { ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/attendance/login', req.url));
    }
  }

  // ── noindex headers for protected areas ─────────────────────────
  const response = NextResponse.next();
  if (pathname.startsWith('/admin') || pathname.startsWith('/attendance')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/attendance/:path*',
    '/api/attendance/:path*',
  ],
};

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/security/session';

/**
 * POST /api/admin/logout
 */

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res, 'admin');
  return res;
}

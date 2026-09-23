import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/security/session';

/**
 * POST /api/attendance/logout
 */

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res, 'attendance');
  return res;
}

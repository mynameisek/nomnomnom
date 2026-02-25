// =============================================================================
// POST /api/admin/login — validate password and set admin session cookie
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { setAdminCookie } from '@/lib/admin-session';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let password: string | undefined;

  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const adminSecret = process.env.ADMIN_SECRET;

  // Reject if ADMIN_SECRET is not configured or password doesn't match
  if (!adminSecret || !password || password !== adminSecret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Password matches — set session cookie
  await setAdminCookie();

  return NextResponse.json({ ok: true }, { status: 200 });
}

// =============================================================================
// Admin session utilities — server-only cookie-based authentication
// =============================================================================
// SECURITY: server-only — never import in Client Components.
// Uses a derived SHA-256 token (not the raw ADMIN_SECRET) stored in the cookie.
// Cookie is httpOnly + secure in production — not accessible via JavaScript.
// =============================================================================

import 'server-only';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours in seconds

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derives a SHA-256 token from ADMIN_SECRET.
 * Storing the derived token (not the raw secret) in the cookie means even if
 * someone reads the cookie they cannot recover the plaintext password.
 */
function getExpectedToken(): string {
  return createHash('sha256')
    .update(process.env.ADMIN_SECRET ?? '')
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the current request carries a valid admin session cookie.
 * Returns false if ADMIN_SECRET is not set, cookie is absent, or value mismatches.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  if (!process.env.ADMIN_SECRET) return false;

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);

  if (!session) return false;

  return session.value === getExpectedToken();
}

/**
 * Sets the admin session cookie on the current response.
 * Should only be called after verifying the password matches ADMIN_SECRET.
 */
export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Clears the admin session cookie (logout).
 */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

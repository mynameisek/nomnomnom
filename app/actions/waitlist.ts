'use server';

import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success'; refCode: string; position: number; referralCount: number }
  | { status: 'duplicate'; refCode: string; position: number; referralCount: number }
  | { status: 'error'; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const REFERRAL_BONUS_SPOTS = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRefCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255;
}

async function getDashboard(refCode: string): Promise<{
  refCode: string;
  position: number;
  referralCount: number;
}> {
  // Get user's row to find their created_at timestamp
  const { data: user, error: userError } = await supabase
    .from('waitlist')
    .select('created_at')
    .eq('ref_code', refCode)
    .single();

  if (userError || !user) {
    return { refCode, position: 1, referralCount: 0 };
  }

  // Count rows signed up before or at the same time (raw position)
  const { count: rawPosition } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .lte('created_at', user.created_at);

  // Count referrals attributed to this ref code
  const { count: referralCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_code', refCode);

  const rawPos = rawPosition ?? 1;
  const refs = referralCount ?? 0;
  const position = Math.max(1, rawPos - refs * REFERRAL_BONUS_SPOTS);

  return { refCode, position, referralCount: refs };
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function joinWaitlist(
  prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const rawEmail = formData.get('email');
  const rawRef = formData.get('ref');

  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const ref = typeof rawRef === 'string' && rawRef.trim() ? rawRef.trim() : null;

  // Validate email
  if (!isValidEmail(email)) {
    return { status: 'error', message: 'Adresse email invalide.' };
  }

  // Check for existing signup
  const { data: existing } = await supabase
    .from('waitlist')
    .select('ref_code, created_at')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const dashboard = await getDashboard(existing.ref_code);
    return { status: 'duplicate', ...dashboard };
  }

  // New signup
  const refCode = generateRefCode();

  const { error: insertError } = await supabase
    .from('waitlist')
    .insert({ email, ref_code: refCode, referrer_code: ref });

  if (insertError) {
    // Race condition: another insert with same email won the race (code 23505 = unique_violation)
    if (insertError.code === '23505') {
      const { data: raceRow } = await supabase
        .from('waitlist')
        .select('ref_code, created_at')
        .eq('email', email)
        .maybeSingle();

      if (raceRow) {
        const dashboard = await getDashboard(raceRow.ref_code);
        return { status: 'duplicate', ...dashboard };
      }
    }

    return {
      status: 'error',
      message: 'Erreur réseau. Réessaie dans quelques secondes.',
    };
  }

  // Success
  const dashboard = await getDashboard(refCode);
  return { status: 'success', ...dashboard };
}

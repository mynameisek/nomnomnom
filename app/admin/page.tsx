// =============================================================================
// /admin — Server Component gate: shows login or dashboard
// =============================================================================
// force-dynamic ensures this page never hits the Next.js page cache.
// Cookie reads and Supabase fetches are always fresh.
// =============================================================================

import type { Metadata } from 'next';
import { isAdminAuthenticated } from '@/lib/admin-session';
import { getAdminConfig } from '@/lib/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | NOM',
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  // Unauthenticated: show password gate
  if (!authenticated) {
    return <AdminLogin />;
  }

  // Authenticated: fetch live data for the dashboard
  const [adminConfig, statsResult, scansResult] = await Promise.all([
    getAdminConfig(),

    supabaseAdmin.rpc('get_scan_stats'),

    supabaseAdmin
      .from('menus')
      .select('id, url, source_type, parsed_at, parse_time_ms')
      .order('parsed_at', { ascending: false })
      .limit(20),
  ]);

  // Fallback stats if RPC fails or returns nothing
  const stats = statsResult.data ?? {
    total_scans: 0,
    active_cache_count: 0,
    avg_parse_time_ms: null,
    total_cache_hits: 0,
  };

  const recentScans = scansResult.data ?? [];

  return (
    <AdminDashboard
      currentModel={adminConfig.llm_model}
      stats={stats}
      recentScans={recentScans}
    />
  );
}

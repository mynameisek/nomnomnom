'use client';

import { useState, useTransition } from 'react';
import { saveAdminModel } from '@/app/actions/admin';

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

// =============================================================================
// Type definitions
// =============================================================================

interface ScanStat {
  total_scans: number;
  active_cache_count: number;
  avg_parse_time_ms: number | null;
  total_cache_hits: number;
}

interface RecentScan {
  id: string;
  url: string;
  source_type: string;
  parsed_at: string;
  parse_time_ms: number | null;
}

interface AdminDashboardProps {
  currentModel: string;
  stats: ScanStat;
  recentScans: RecentScan[];
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${days} j`;
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + '…';
}

// =============================================================================
// AdminDashboard
// =============================================================================

export default function AdminDashboard({
  currentModel,
  stats,
  recentScans,
}: AdminDashboardProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const result = await saveAdminModel(selectedModel);

      if ('error' in result) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(true);
        // Auto-hide success indicator after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    });
  }

  // Cache ratio
  const cacheRatio =
    stats.total_scans > 0
      ? Math.round((stats.active_cache_count / stats.total_scans) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-white">
      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-white">Admin — NOM</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Tableau de bord opérationnel</p>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.reload();
          }}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-brand-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
        >
          Déconnexion
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ------------------------------------------------------------------ */}
        {/* Section 1: Model Selector                                           */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-lg font-semibold text-brand-white mb-4">
            Modèle LLM actif
          </h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            {/* Current model badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-zinc-400 text-sm">Actuellement :</span>
              <span className="px-3 py-1 bg-brand-orange/20 text-brand-orange text-sm font-mono rounded-full border border-brand-orange/30">
                {currentModel}
              </span>
            </div>

            {/* Selector + save */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-brand-white font-mono text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors disabled:opacity-50"
              >
                {ALLOWED_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSave}
                disabled={isPending || selectedModel === currentModel}
                className="px-5 py-2.5 bg-brand-orange text-white font-semibold rounded-lg hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            {/* Feedback messages */}
            {saveSuccess && (
              <p className="mt-3 text-sm text-green-400 font-medium">
                Modèle mis à jour
              </p>
            )}
            {saveError && (
              <p className="mt-3 text-sm text-red-400">{saveError}</p>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Section 2: Stats cards                                              */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-lg font-semibold text-brand-white mb-4">
            Statistiques
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat: Total scans */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Scans totaux
              </p>
              <p className="text-4xl font-bold text-brand-white">
                {stats.total_scans}
              </p>
            </div>

            {/* Stat: Cache ratio */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Ratio cache
              </p>
              <p className="text-4xl font-bold text-brand-white">
                {cacheRatio}%
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {stats.active_cache_count}/{stats.total_scans} entrées actives
                &middot; {stats.total_cache_hits} hits
              </p>
            </div>

            {/* Stat: Avg parse time */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                Temps de parse moyen
              </p>
              <p className="text-4xl font-bold text-brand-white">
                {stats.avg_parse_time_ms != null
                  ? `${Math.round(stats.avg_parse_time_ms)}ms`
                  : 'N/A'}
              </p>
              <p className="text-zinc-500 text-xs mt-1">LLM uniquement (hors cache)</p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Section 3: Recent scans                                             */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <h2 className="text-lg font-semibold text-brand-white mb-1">
            Derniers scans
          </h2>
          <p className="text-zinc-400 text-sm mb-4">20 derniers</p>

          {recentScans.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              Aucun scan enregistré
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">URL</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Source</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Parse</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-medium">Il y a</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((scan, i) => (
                      <tr
                        key={scan.id}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors ${
                          i === recentScans.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="font-mono text-xs text-zinc-300"
                            title={scan.url}
                          >
                            {truncateUrl(scan.url)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">
                            {scan.source_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">
                          {scan.parse_time_ms != null
                            ? `${scan.parse_time_ms}ms`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                          {formatRelativeTime(scan.parsed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

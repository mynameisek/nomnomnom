'use client';

import { useState } from 'react';

// =============================================================================
// AdminLogin — password gate for /admin
// =============================================================================
// Renders a centered password form. On success, reloads the page so the Server
// Component re-renders with the newly set session cookie.
// =============================================================================

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Reload to let the Server Component pick up the new cookie
        window.location.reload();
      } else {
        setError('Mot de passe incorrect');
      }
    } catch {
      setError('Erreur réseau — réessayez');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-white mb-1">Admin</h1>
          <p className="text-zinc-400 text-sm">Accès restreint</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-brand-white placeholder-zinc-500 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors disabled:opacity-50"
            />
            {/* Inline error */}
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-4 bg-brand-orange text-white font-semibold rounded-lg hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 focus:ring-offset-brand-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UrlInputProps {
  onScanStart: () => void;
  onStepAdvance: (step: number) => void;
  onError: (error: string) => void;
  onComplete: () => void;
  disabled?: boolean;
}

export default function UrlInput({
  onScanStart,
  onStepAdvance,
  onError,
  onComplete,
  disabled = false,
}: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();

  // Listen for QR-decoded URLs from QrScanner component
  useEffect(() => {
    function handleQrDecoded(e: Event) {
      const customEvent = e as CustomEvent<{ url: string }>;
      setUrl(customEvent.detail.url);
      // Auto-submit after state update
      setTimeout(() => {
        const form = document.getElementById('url-scan-form') as HTMLFormElement | null;
        form?.requestSubmit();
      }, 100);
    }
    window.addEventListener('qr-decoded', handleQrDecoded);
    return () => window.removeEventListener('qr-decoded', handleQrDecoded);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || isScanning) return;

    setIsScanning(true);
    onScanStart();

    // Advance progress steps on a timer while the request runs (3 steps: 0, 1, 2)
    let step = 0;
    const stepTimer = setInterval(() => {
      step = Math.min(step + 1, 1);
      onStepAdvance(step);
    }, 2500);

    try {
      const res = await fetch('/api/scan/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(stepTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      onStepAdvance(2);
      onComplete();

      // Brief pause at final step so user sees it complete
      await new Promise((r) => setTimeout(r, 400));
      router.push(`/menu/${data.menuId}`);
    } catch (err) {
      clearInterval(stepTimer);
      setIsScanning(false);
      onError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form id="url-scan-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="menu-url" className="text-sm text-brand-muted font-medium">
          Menu URL
        </label>
        <input
          id="menu-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://menu.example.com"
          disabled={isScanning || disabled}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-orange/50 focus:bg-white/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={!url.trim() || isScanning || disabled}
        className="w-full py-3 px-6 rounded-xl bg-brand-orange text-white font-semibold text-sm hover:bg-brand-orange/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
      >
        {isScanning ? 'Scanning...' : 'Scan'}
      </button>
    </form>
  );
}

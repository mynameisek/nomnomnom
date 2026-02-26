'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import UrlInput from './UrlInput';
import PhotoUpload from './PhotoUpload';
import ScanProgress from './ScanProgress';

// QrScanner uses browser APIs — dynamic import with no SSR
const QrScanner = dynamic(() => import('./QrScanner'), { ssr: false });

type TabId = 'qr' | 'url' | 'photo';
type ScanState = 'idle' | 'scanning' | 'error';

function ScanError({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  const isNoDishes = error === 'NO_DISHES';

  if (isNoDishes) {
    return (
      <div className="mb-4 px-4 py-4 rounded-xl bg-brand-red/5 border border-brand-red/20">
        <p className="text-brand-white text-sm font-semibold mb-2">
          Aucun plat trouv&eacute; sur cette page
        </p>
        <p className="text-brand-muted text-xs leading-relaxed mb-3">
          Cette URL ne semble pas contenir de menu. Quelques pistes :
        </p>
        <ul className="text-brand-muted text-xs leading-relaxed mb-3 space-y-1.5 list-none">
          <li className="flex gap-2">
            <span className="flex-shrink-0">&#x2794;</span>
            <span>Essayez avec le <strong className="text-brand-white">lien direct</strong> de la page menu du restaurant (souvent &laquo; Carte &raquo; ou &laquo; Menu &raquo;)</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0">&#x1F4F7;</span>
            <span>Prenez une <strong className="text-brand-white">photo</strong> du menu ou scannez le <strong className="text-brand-white">QR code</strong> du restaurant</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0">&#x26A0;&#xFE0F;</span>
            <span>Certains menus (PDF, images, sites interactifs) ne sont pas encore support&eacute;s</span>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-medium hover:bg-brand-orange/15 transition-colors"
          >
            R&eacute;essayer
          </button>
          <a
            href="https://github.com/mynameisek/nomnomnom/issues/new?title=Menu%20non%20reconnu&body=URL%20du%20menu%20:%20(collez%20ici)"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-muted text-xs underline hover:text-brand-white transition-colors"
          >
            Signaler ce menu
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
      <strong>Error:</strong> {error}
      <button
        onClick={onDismiss}
        className="ml-2 underline text-xs opacity-70 hover:opacity-100"
      >
        Dismiss
      </button>
    </div>
  );
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'qr', label: 'QR Code' },
  { id: 'photo', label: 'Photo' },
];

export default function ScanTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('url');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  function handleScanStart() {
    setScanState('scanning');
    setError(null);
    setCurrentStep(0);
    setIsComplete(false);
  }

  function handleStepAdvance(step: number) {
    setCurrentStep(step);
  }

  function handleError(err: string) {
    setScanState('error');
    setError(err);
    setCurrentStep(0);
    setIsComplete(false);
  }

  function handleComplete() {
    setIsComplete(true);
    setScanState('idle');
  }

  // QR scanner decodes a URL then feeds it into the URL scan flow
  const handleQrResult = useCallback(
    (decodedUrl: string) => {
      // Switch to URL tab to show the URL input flow
      setActiveTab('url');
      // Delay event dispatch to let React re-render and mount UrlInput first.
      // UrlInput's useEffect registers the 'qr-decoded' listener on mount.
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('qr-decoded', { detail: { url: decodedUrl } }),
        );
      }, 200);
    },
    [],
  );

  const isScanning = scanState === 'scanning';

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tab bar */}
      <div className="flex border-b border-white/10 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setError(null);
            }}
            disabled={isScanning}
            className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-brand-orange border-brand-orange'
                : 'text-brand-muted border-transparent hover:text-brand-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Progress overlay — shown during scan */}
      {isScanning || isComplete ? (
        <ScanProgress currentStep={currentStep} isComplete={isComplete} />
      ) : (
        <>
          {/* Error message */}
          {error && (
            <ScanError error={error} onDismiss={() => setError(null)} />
          )}

          {/* URL tab */}
          {activeTab === 'url' && (
            <UrlInput
              onScanStart={handleScanStart}
              onStepAdvance={handleStepAdvance}
              onError={handleError}
              onComplete={handleComplete}
            />
          )}

          {/* QR tab */}
          {activeTab === 'qr' && (
            <div className="flex flex-col gap-4">
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-muted text-xs text-center">
                On mobile, point your camera app at the QR code — it opens automatically. Use this scanner as a fallback.
              </div>
              <QrScanner onResult={handleQrResult} />
            </div>
          )}

          {/* Photo tab */}
          {activeTab === 'photo' && (
            <PhotoUpload
              onScanStart={handleScanStart}
              onStepAdvance={handleStepAdvance}
              onError={handleError}
              onComplete={handleComplete}
            />
          )}
        </>
      )}
    </div>
  );
}

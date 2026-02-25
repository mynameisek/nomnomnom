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
      // Programmatically trigger the URL scan by dispatching a custom event
      // (simpler than prop drilling — UrlInput listens for this)
      window.dispatchEvent(
        new CustomEvent('qr-decoded', { detail: { url: decodedUrl } }),
      );
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
            <div className="mb-4 px-4 py-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 underline text-xs opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
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

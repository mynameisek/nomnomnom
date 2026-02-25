'use client';

import { useEffect, useRef } from 'react';

interface QrScannerProps {
  onResult: (url: string) => void;
}

export default function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoEl = videoRef.current;
    let destroyed = false;

    import('qr-scanner').then((mod) => {
      if (destroyed || !videoEl) return;

      const QrScannerLib = mod.default;
      const scanner = new QrScannerLib(
        videoEl,
        (result: { data: string }) => {
          scanner.stop();
          onResult(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );

      scannerRef.current = scanner;
      scanner.start().catch((err: unknown) => {
        console.error('[QrScanner] Failed to start camera:', err);
      });
    });

    return () => {
      destroyed = true;
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [onResult]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border border-white/10">
        <video
          ref={videoRef}
          className="w-full"
          style={{ maxHeight: 300, objectFit: 'cover' }}
          playsInline
          muted
        />
      </div>
      <p className="text-brand-muted text-xs animate-pulse">Scanning for QR code...</p>
    </div>
  );
}

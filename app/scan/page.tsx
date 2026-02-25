import type { Metadata } from 'next';
import ScanTabs from '@/components/scan/ScanTabs';
import ScanPageShell from '@/components/scan/ScanPageShell';

export const metadata: Metadata = {
  title: 'Scan a Menu | NOM',
  description: 'Scan any restaurant menu — QR code, URL, or photo. Get instant translations and dish explanations.',
};

export default function ScanPage() {
  return (
    <ScanPageShell>
      <div className="min-h-screen bg-brand-bg flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-brand-white mb-2">Scan a Menu</h1>
            <p className="text-brand-muted text-sm">
              Paste a URL, scan a QR code, or take a photo of the menu.
            </p>
          </div>

          {/* Scan tabs */}
          <ScanTabs />
        </div>
      </div>
    </ScanPageShell>
  );
}

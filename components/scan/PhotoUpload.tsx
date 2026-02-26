'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';

interface PhotoUploadProps {
  onScanStart: () => void;
  onStepAdvance: (step: number) => void;
  onError: (error: string) => void;
  onComplete: () => void;
  disabled?: boolean;
}

export default function PhotoUpload({
  onScanStart,
  onStepAdvance,
  onError,
  onComplete,
  disabled = false,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    onScanStart();

    // Advance progress steps on a timer while the request runs (3 steps: 0, 1, 2)
    let step = 0;
    const stepTimer = setInterval(() => {
      step = Math.min(step + 1, 1);
      onStepAdvance(step);
    }, 2500);

    try {
      // INFR-04: Resize to 1024px max before upload
      const compressed = await imageCompression(selectedFile, {
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        maxSizeMB: 2,
        fileType: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('image', compressed);

      // Do NOT set Content-Type header — browser sets multipart boundary automatically
      const res = await fetch('/api/scan/photo', {
        method: 'POST',
        body: formData,
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
      setIsUploading(false);
      onError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* File input (hidden) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || disabled}
      />

      {/* Preview */}
      {preview && (
        <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-white/10 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selected menu photo"
            className="w-full object-contain"
            style={{ maxHeight: 200 }}
          />
        </div>
      )}

      {/* Choose / Take photo button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading || disabled}
        className="w-full py-3 px-6 rounded-xl bg-white/5 border border-white/10 text-brand-white font-medium text-sm hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
      >
        {preview ? 'Change photo' : 'Take Photo or Choose File'}
      </button>

      {/* Upload button (only visible when a file is selected) */}
      {selectedFile && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || disabled}
          className="w-full py-3 px-6 rounded-xl bg-brand-orange text-white font-semibold text-sm hover:bg-brand-orange/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
        >
          {isUploading ? 'Uploading...' : 'Upload & Scan'}
        </button>
      )}
    </div>
  );
}

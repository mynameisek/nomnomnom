'use client';

import { useEffect, useState } from 'react';

interface ScanProgressProps {
  currentStep: number; // 0-2
  isComplete: boolean;
}

const STEPS = [
  { label: 'Reading menu...', icon: '🔍' },
  { label: 'Identifying dishes...', icon: '🍽' },
  { label: 'Almost done!', icon: '✓' },
];

export default function ScanProgress({ currentStep, isComplete }: ScanProgressProps) {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isComplete) setShowSlowMessage(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isComplete]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <p className="text-brand-muted text-sm uppercase tracking-widest font-medium">Processing</p>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep && !isComplete;
          const isCompleted = index < currentStep || isComplete;
          const isPending = index > currentStep && !isComplete;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                isActive
                  ? 'bg-brand-orange/10 border border-brand-orange/30'
                  : isCompleted
                  ? 'bg-white/5 border border-white/10 opacity-70'
                  : 'bg-white/5 border border-white/5 opacity-30'
              }`}
            >
              <span
                className={`text-lg flex-shrink-0 ${
                  isActive ? 'animate-pulse' : ''
                }`}
              >
                {isCompleted ? '✓' : step.icon}
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-brand-orange'
                    : isCompleted
                    ? 'text-brand-green'
                    : 'text-brand-muted'
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="ml-auto">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />
                </span>
              )}
              {isCompleted && !isPending && (
                <span className="ml-auto text-brand-green text-sm">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {showSlowMessage && !isComplete && (
        <p className="text-brand-muted text-xs text-center mt-2 animate-pulse">
          Still working on it... complex menus take a moment.
        </p>
      )}
    </div>
  );
}

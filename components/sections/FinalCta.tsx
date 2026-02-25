'use client';

import { Suspense, useActionState, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { joinWaitlist, type WaitlistState } from '@/app/actions/waitlist';
import Btn from '@/components/ui/Btn';
import { FOOD } from '@/lib/data';

// ─── Inner form component — needs useSearchParams (requires Suspense boundary) ─

function WaitlistForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') ?? '';

  const [state, formAction, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { status: 'idle' },
  );

  const [copied, setCopied] = useState(false);

  const showDashboard =
    state.status === 'success' || state.status === 'duplicate';

  const referralUrl =
    typeof window !== 'undefined' && showDashboard
      ? `${window.location.origin}?ref=${(state as { refCode: string }).refCode}`
      : '';

  function handleCopy() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!showDashboard ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <form action={formAction} className="flex flex-col sm:flex-row gap-3">
              <input type="hidden" name="ref" value={ref} />
              <input
                type="email"
                name="email"
                required
                placeholder="ton@email.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-full font-bold cursor-pointer transition-all duration-200 px-[22px] py-[11px] text-[13px] bg-gradient-to-br from-brand-orange to-brand-red text-white border-none shadow-[0_12px_36px_rgba(255,107,53,0.22)] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {pending ? 'Inscription\u2026' : "C\u2019est parti"}
              </button>
            </form>

            {state.status === 'error' && (
              <p role="alert" className="text-red-400 text-sm mt-2">
                {state.message}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Status message */}
            {state.status === 'success' ? (
              <p className="text-green-400 font-semibold mb-4">
                Parfait\u00a0! On te pr\u00e9vient d\u00e8s que c\u2019est pr\u00eat.
              </p>
            ) : (
              <p className="text-orange-400 font-semibold mb-4">
                Tu es d\u00e9j\u00e0 inscrit(e)\u00a0!
              </p>
            )}

            {/* Referral dashboard */}
            <div className="bg-white/5 rounded-2xl p-6 mt-2">
              <div className="flex flex-wrap gap-6">
                {/* Position */}
                <div className="flex flex-col gap-1">
                  <span className="text-white/40 text-xs uppercase tracking-wide">
                    Ta position
                  </span>
                  <span className="text-2xl font-black text-white">
                    #{(state as { position: number }).position}
                  </span>
                </div>

                {/* Referrals */}
                <div className="flex flex-col gap-1">
                  <span className="text-white/40 text-xs uppercase tracking-wide">
                    Ami(s) parrainé(s)
                  </span>
                  <span className="text-2xl font-black text-white">
                    {(state as { referralCount: number }).referralCount} 👥
                  </span>
                </div>

                {/* Share link */}
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                  <span className="text-white/40 text-xs uppercase tracking-wide">
                    Ton lien de parrainage
                  </span>
                  <div className="flex gap-2 items-center">
                    <input
                      readOnly
                      value={referralUrl}
                      className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white/70 flex-1 focus:outline-none"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center gap-1 rounded-full font-bold cursor-pointer transition-all duration-200 px-4 py-2 text-[13px] bg-white/10 border border-white/10 text-white/65 whitespace-nowrap hover:bg-white/15"
                    >
                      {copied ? 'Copi\u00e9\u00a0!' : 'Copier'}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-white/25 text-xs mt-4">
                Chaque ami inscrit via ton lien te fait monter de 5 places.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FinalCta() {
  return (
    <>
      {/* Waitlist section */}
      <section id="waitlist" className="py-9">
        <div className="mx-auto max-w-content px-6">
          <div className="rounded-3xl overflow-hidden relative border border-brand-orange/10">
            {/* Background food collage */}
            <div className="absolute inset-0 flex flex-row opacity-[0.08] overflow-hidden">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="h-full relative"
                  style={{ flex: '0 0 25%' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: FOOD[i].grad }}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={FOOD[i].url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Content overlay */}
            <div className="relative p-8 px-6 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-extrabold mb-1">
                  Rejoins les premiers testeurs
                </h2>
                <p className="text-[13px] text-white/40 m-0">
                  Acces beta TestFlight (iOS) et Android. Gratuit, sans engagement.
                </p>
              </div>

              {/* Waitlist form with Suspense boundary for useSearchParams */}
              <Suspense
                fallback={
                  <div className="flex gap-3">
                    <div className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                    <div className="h-12 w-36 rounded-full bg-brand-orange/30 animate-pulse" />
                  </div>
                }
              >
                <WaitlistForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA — unchanged */}
      <section className="py-[70px] px-6 pb-[90px] text-center relative">
        {/* Radial glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 450,
            height: 450,
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 60%)',
          }}
        />
        <h2
          className="font-black leading-tight tracking-tight mb-3"
          style={{ fontSize: 'clamp(28px, 4.2vw, 48px)' }}
        >
          Plus jamais hesiter
          <br />
          <span className="italic text-white/[0.18] font-normal">
            devant un menu.
          </span>
        </h2>
        <p className="text-[15px] text-white/30 max-w-[40ch] mx-auto mb-7 leading-relaxed">
          200 cuisines. 50 langues. Un seul geste.
        </p>
        <Btn primary big href="#waitlist">
          Rejoindre la liste d&apos;attente
        </Btn>
        <p className="text-[10px] text-white/[0.12] mt-3">
          Gratuit pour scanner. Toujours.
        </p>
      </section>
    </>
  );
}

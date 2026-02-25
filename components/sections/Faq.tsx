"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FAQS } from "@/lib/data";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex justify-between items-center cursor-pointer bg-transparent border-none text-white text-left"
      >
        <span className="text-[13px] font-bold">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="text-[18px] flex-shrink-0 ml-2.5"
          style={{ color: open ? "#ff6b35" : "rgba(255,255,255,0.2)" }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-white/45 leading-relaxed m-0">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  return (
    <section id="faq" className="py-10 pb-12">
      <div className="max-w-[680px] mx-auto px-6">
        <p className="text-[11px] text-brand-orange uppercase tracking-[2px] font-bold mb-2">
          Questions frequentes
        </p>
        <h2
          className="font-extrabold leading-tight tracking-tight mb-4"
          style={{ fontSize: "clamp(24px, 3.5vw, 38px)" }}
        >
          Tout ce que tu veux savoir
        </h2>
        {FAQS.map((f, i) => (
          <FaqItem key={i} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}

import React from "react";

type PillProps = {
  children: React.ReactNode;
  glow?: boolean;
};

export default function Pill({ children, glow = false }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-[13px] py-[5px] rounded-full text-[11px] font-bold whitespace-nowrap border ${
        glow
          ? "bg-brand-orange/[0.12] border-brand-orange/[0.22] text-brand-orange"
          : "bg-white/[0.06] border-white/[0.07] text-white/50"
      }`}
    >
      {children}
    </span>
  );
}

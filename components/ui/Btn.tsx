import React from "react";
import Link from "next/link";

type BtnBaseProps = {
  children: React.ReactNode;
  primary?: boolean;
  big?: boolean;
  className?: string;
};

type BtnAsAnchor = BtnBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type BtnAsButton = BtnBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type BtnProps = BtnAsAnchor | BtnAsButton;

export default function Btn({ children, primary, big, className = "", ...props }: BtnProps) {
  const baseClasses = `inline-flex items-center justify-center gap-2 rounded-full font-bold cursor-pointer transition-all duration-200 ${
    big ? "px-9 py-4 text-base" : "px-[22px] py-[11px] text-[13px]"
  } ${
    primary
      ? "bg-gradient-to-br from-brand-orange to-brand-red text-white border-none shadow-[0_12px_36px_rgba(255,107,53,0.22)]"
      : "bg-white/[0.04] border border-white/10 text-white/65"
  } ${className}`;

  if ("href" in props && props.href) {
    const { href, ...anchorProps } = props as BtnAsAnchor;
    const isInternal = href.startsWith('/');
    if (isInternal) {
      return (
        <Link href={href} className={baseClasses} {...(anchorProps as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>)}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={baseClasses} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = props as BtnAsButton;
  return (
    <button className={baseClasses} {...buttonProps}>
      {children}
    </button>
  );
}

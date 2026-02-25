'use client';

import { motion } from 'motion/react';

type ScanPageShellProps = {
  children: React.ReactNode;
};

export default function ScanPageShell({ children }: ScanPageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

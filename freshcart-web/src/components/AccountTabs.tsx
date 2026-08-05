'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface AccountTabsProps {
  activeKey: string;
  children: ReactNode;
}

// Shared fade + 8px vertical slide used everywhere an account page swaps tab
// content (Profile Overview/Security, Orders/Returns) — one implementation so
// every tab switch in the section animates identically, 200ms.
export function AccountTabs({ activeKey, children }: AccountTabsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

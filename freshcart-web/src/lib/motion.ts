import type { Variants } from 'framer-motion';

export const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const cartBumpVariants: Variants = {
  idle: { scale: 1, y: 0 },
  bump: {
    scale: [1, 1.3, 0.92, 1.12, 1],
    y: [0, -9, 0, -4, 0],
    transition: { duration: 0.55, ease: 'easeInOut' },
  },
};

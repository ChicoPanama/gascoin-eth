'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HeroStagger({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      className={className}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
}

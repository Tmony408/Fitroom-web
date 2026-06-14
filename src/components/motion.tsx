'use client';
import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

const ease: [number, number, number, number] = [0.22, 0.7, 0.2, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/** Fades + lifts its children in on mount. */
export function FadeIn({ children, delay = 0, className, style }: {
  children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Reveals children with a stagger as they enter the viewport. */
export function Reveal({ children, className, style }: {
  children: ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered item (use inside <Reveal>). */
export function Item({ children, className, style }: {
  children: ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div className={className} style={style} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/**
 * Scroll-reveal: animates in each time it enters the viewport (fade + lift +
 * slight zoom). `once: false` so it re-triggers as you scroll up/down.
 */
export function ScrollIn({ children, delay = 0, className, style }: {
  children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{ duration: 0.55, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Hover-spring wrapper for interactive cards. */
export function Hover({ children, className, style }: {
  children: ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
    >
      {children}
    </motion.div>
  );
}

export { motion };

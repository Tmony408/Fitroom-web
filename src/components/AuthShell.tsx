'use client';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import SmartImage from '@/components/SmartImage';
import { useSiteSettings } from '@/lib/useSiteSettings';

/** Two-column auth layout: form left, cinematic fashion image right. */
export default function AuthShell({ title, subtitle, children }: {
  title: string; subtitle: string; children: ReactNode;
}) {
  const images = useSiteSettings();
  return (
    <div className="two" style={{ alignItems: 'stretch', gap: 28 }}>
      <motion.div
        initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 0.7, 0.2, 1] }}>
        <span className="eyebrow">✦ FitRoom</span>
        <h1 style={{ marginTop: 8 }}>{title}</h1>
        <p className="sub">{subtitle}</p>
        {children}
      </motion.div>
      <motion.div
        className="hero-img"
        style={{ aspectRatio: 'auto', minHeight: 'clamp(220px, 45vh, 460px)' }}
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.7, 0.2, 1], delay: 0.1 }}>
        <SmartImage src={images.auth} alt="African fashion" gradientIndex={1} className="kenburns" />
        <div className="hero-badge" style={{ bottom: 18, left: 18, right: 18 }}>
          <div className="small muted">“My agbada fit perfectly — first try, from London.”</div>
          <div className="small" style={{ marginTop: 6, fontWeight: 700 }}>— Diaspora customer</div>
        </div>
      </motion.div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { FALLBACK_GRADIENTS } from '@/lib/images';

/**
 * <img> with a graceful gradient fallback + fade-in on load. Keeps the UI
 * polished even if a hotlinked Unsplash URL fails or the user is offline.
 */
export default function SmartImage({
  src, alt, className, gradientIndex = 0, style,
}: {
  src: string; alt: string; className?: string; gradientIndex?: number; style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const grad = FALLBACK_GRADIENTS[gradientIndex % FALLBACK_GRADIENTS.length];

  if (failed) {
    return <div className={className} aria-label={alt} style={{ ...style, background: grad, width: '100%', height: '100%' }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity .6s ease' }}
    />
  );
}

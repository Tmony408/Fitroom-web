'use client';
import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

/** Counts up to `value` on mount. Pass `prefix` (e.g. ₦) for money. */
export default function Counter({ value, prefix = '', duration = 1.1 }: {
  value: number; prefix?: string; duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 0.7, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span>{prefix}{Math.round(display).toLocaleString()}</span>;
}

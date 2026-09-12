'use client';
import * as React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { duration, ease, distance } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

export function PageTransition({
  children,
  routeKey,
  lowPowerMode = false,
}: {
  children: React.ReactNode;
  routeKey?: string;
  lowPowerMode?: boolean;
}) {
  const reduced = usePrefersReducedMotion(lowPowerMode);

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        key={routeKey}
        id="main"
        initial={{ opacity: 0, y: reduced ? 0 : distance.enter }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -distance.rise }}
        transition={{ duration: reduced ? 0.01 : duration.medium, ease: ease.standard }}
        onAnimationComplete={() => {
          // never leave will-change on
          document.getElementById('main')?.style.removeProperty('will-change');
        }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.main>
    </MotionConfig>
  );
}

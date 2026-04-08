'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  variant?: 'default' | 'glow';
}

export function GlassCard({ children, className = '', glow, variant = 'default' }: GlassCardProps) {
  const isGlow = variant === 'glow' || glow;
  return (
    <div className={`glass-card${isGlow ? ' glass-card--glow' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

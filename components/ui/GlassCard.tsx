'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassCard({ children, className = '', glow = false }: GlassCardProps) {
  return (
    <div className={`glass-card${glow ? ' glass-card--glow' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

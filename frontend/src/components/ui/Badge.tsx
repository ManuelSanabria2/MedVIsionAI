import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'normal' | 'anomaly' | 'critical' | 'processing';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'normal',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wide uppercase select-none';
  
  const variantStyles = {
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    anomaly: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
    processing: 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

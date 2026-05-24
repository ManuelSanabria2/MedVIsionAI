import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'scan' | 'alert';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'bg-white rounded-xl border p-5 transition-all duration-300 dark:bg-primary dark:border-brand-gray/15';
  
  const variantStyles = {
    default: 'border-brand-gray/15 shadow-sm hover:shadow-md dark:border-white/10',
    scan: 'border-accent shadow-scan scan-overlay dark:border-accent/60',
    alert: 'border-danger shadow-alert anomaly-highlight dark:border-danger/60',
  };

  return (
    <div
      role="region"
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

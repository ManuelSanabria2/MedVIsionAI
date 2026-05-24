import React from 'react';
import { Card } from './ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'critical';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral',
  className = '',
}) => {
  const trendColors = {
    positive: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400',
    negative: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400',
    critical: 'text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400',
    neutral: 'text-brand-gray bg-brand-deep/5 dark:bg-white/5 dark:text-brand-gray',
  };

  return (
    <Card className={`flex items-center justify-between p-5 relative overflow-hidden group select-none ${className}`}>
      {/* Icon & Details */}
      <div className="flex items-center gap-4 z-10">
        <div className="p-3 bg-brand-deep/5 rounded-xl border border-brand-gray/10 text-brand-deep dark:bg-white/5 dark:border-white/10 dark:text-accent group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <span className="block text-brand-gray text-[10px] uppercase font-bold tracking-wider font-sans">
            {title}
          </span>
          <span className="block text-2xl font-black text-brand-deep font-mono dark:text-white mt-1 leading-none">
            {value}
          </span>
        </div>
      </div>

      {/* Trend Badge */}
      {trend && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase shadow-sm ${trendColors[trendType]}`}>
          {trend}
        </span>
      )}

      {/* Subtle background abstract glow */}
      <div className="absolute right-0 bottom-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform" />
    </Card>
  );
};
export default MetricCard;

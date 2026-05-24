import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = 'medical-tooltip-' + Math.random().toString(36).substring(2, 9);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <div aria-describedby={tooltipId} tabIndex={0} className="focus:outline-none">
        {children}
      </div>
      
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-primary/95 text-white text-[10px] rounded-lg shadow-lg border border-accent/20 backdrop-blur-sm select-none pointer-events-none transition-all duration-300 font-sans"
        >
          <div className="flex flex-col gap-1 font-sans">
            <span className="block font-bold text-accent uppercase tracking-wider text-[8px] font-mono">Información Clínica</span>
            <div className="text-white/95 leading-relaxed">{content}</div>
          </div>
          {/* Triángulo indicador */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-primary" />
        </div>
      )}
    </div>
  );
};

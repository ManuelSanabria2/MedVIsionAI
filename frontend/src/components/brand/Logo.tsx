import type { FC } from 'react';

/**
 * Marca MedVision AI — "retícula diagnóstica".
 *
 * Un visor/apertura (cuatro esquinas de encuadre) que rodea una onda de pulso
 * (ECG). Une los dos conceptos del producto: visión (apertura) + señal clínica
 * (pulso). El marco usa `currentColor` para adaptarse a fondos claros/oscuros;
 * el pulso siempre va en cian de marca para destacar sobre navy y blanco.
 */
export const LogoMark: FC<{ size?: number; className?: string; pulse?: string }> = ({
  size = 32,
  className = '',
  pulse = '#00C2CB',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    className={className}
    role="img"
    aria-label="MedVision AI"
  >
    {/* Esquinas de la apertura (encuadre / visor) — heredan color del texto */}
    <g
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 13V8a2 2 0 0 1 2-2h5" />
      <path d="M27 6h5a2 2 0 0 1 2 2v5" />
      <path d="M34 27v5a2 2 0 0 1-2 2h-5" />
      <path d="M13 34H8a2 2 0 0 1-2-2v-5" />
    </g>
    {/* Onda de pulso — siempre cian de marca */}
    <path
      d="M7 20h6l2.5-7 4 14 2.5-7h6"
      stroke={pulse}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface LogoProps {
  /** 'full' = marca + wordmark; 'mark' = solo símbolo */
  variant?: 'full' | 'mark';
  size?: number;
  className?: string;
  /** Color del wordmark. Por defecto hereda (currentColor). */
  wordmarkClassName?: string;
}

export const Logo: FC<LogoProps> = ({
  variant = 'full',
  size = 32,
  className = '',
  wordmarkClassName = '',
}) => {
  if (variant === 'mark') {
    return <LogoMark size={size} className={className} />;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-sans font-black tracking-tight leading-none ${wordmarkClassName}`}
        style={{ fontSize: size * 0.55 }}
      >
        Med<span style={{ color: '#00C2CB' }}>Vision</span>
        <span className="font-mono font-medium tracking-widest align-top" style={{ fontSize: size * 0.28, marginLeft: 3 }}>
          AI
        </span>
      </span>
    </span>
  );
};

export default Logo;

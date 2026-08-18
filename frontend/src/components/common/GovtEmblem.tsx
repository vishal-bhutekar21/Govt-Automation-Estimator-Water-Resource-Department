import React from 'react';

interface GovtEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'color' | 'white' | 'gold' | 'navy';
}

export const GovtEmblem: React.FC<GovtEmblemProps> = ({
  className = '',
  size = 'md',
  variant = 'color',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      title="Government of Maharashtra • Maharashtra Shasan"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Ring */}
        <circle cx="50" cy="50" r="47" stroke={variant === 'white' ? '#FFFFFF' : '#D97706'} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="43" stroke={variant === 'white' ? '#E2E8F0' : '#1E3A8A'} strokeWidth="1.5" />

        {/* Decorative Ring Dots */}
        {[...Array(16)].map((_, i) => {
          const angle = (i * 360) / 16;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 45 * Math.cos(rad);
          const y = 50 + 45 * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.2"
              fill={variant === 'white' ? '#FFFFFF' : '#D97706'}
            />
          );
        })}

        {/* Inner Seal Base */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill={variant === 'white' ? '#0F172A' : '#FEF3C7'}
          fillOpacity={variant === 'white' ? '0.4' : '0.6'}
        />

        {/* Traditional Maharashtra Diya (Deepjyoti Lamp) / Royal Rajmudra Crest */}
        {/* Lamp Base */}
        <path
          d="M 32 68 C 35 73, 65 73, 68 68 C 65 65, 35 65, 32 68 Z"
          fill={variant === 'white' ? '#FFFFFF' : '#B45309'}
        />
        {/* Lamp Stand */}
        <path
          d="M 46 65 L 54 65 L 53 52 L 47 52 Z"
          fill={variant === 'white' ? '#FFFFFF' : '#B45309'}
        />
        {/* Lamp Bowl */}
        <path
          d="M 30 52 C 30 60, 70 60, 70 52 C 60 54, 40 54, 30 52 Z"
          fill={variant === 'white' ? '#FBBF24' : '#D97706'}
        />
        {/* Sacred Flame (Deepak Jyoti) */}
        <path
          d="M 50 25 C 44 35, 41 43, 44 48 C 47 53, 53 53, 56 48 C 59 43, 56 35, 50 25 Z"
          fill={variant === 'white' ? '#FDE68A' : '#EF4444'}
        />
        {/* Inner Flame Core */}
        <path
          d="M 50 32 C 47 38, 45 43, 47 46 C 49 49, 51 49, 53 46 C 55 43, 53 38, 50 32 Z"
          fill={variant === 'white' ? '#FFFFFF' : '#FBBF24'}
        />

        {/* Ashoka Chakra / Star rays at top */}
        <circle cx="50" cy="18" r="3" fill={variant === 'white' ? '#FFFFFF' : '#1E3A8A'} />
        <path
          d="M 50 12 L 50 15 M 50 21 L 50 24 M 44 18 L 47 18 M 53 18 L 56 18"
          stroke={variant === 'white' ? '#FFFFFF' : '#1E3A8A'}
          strokeWidth="1"
        />

        {/* Motto Leaves Garland */}
        <path
          d="M 22 50 C 20 62, 28 72, 38 78"
          stroke={variant === 'white' ? '#94A3B8' : '#059669'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 78 50 C 80 62, 72 72, 62 78"
          stroke={variant === 'white' ? '#94A3B8' : '#059669'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

import React from 'react';
import govtLogo from '../../assets/maharashtra_govt_logo.png';

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
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}
      title="Government of Maharashtra • Maharashtra Shasan"
    >
      <img
        src={govtLogo}
        alt="Government of Maharashtra Official Emblem"
        className={`w-full h-full object-contain select-none drop-shadow-sm ${
          variant === 'white' ? 'brightness-0 invert' : ''
        }`}
      />
    </div>
  );
};

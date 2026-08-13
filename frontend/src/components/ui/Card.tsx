import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'accent-border';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-slate-200/80 shadow-soft-sm',
    elevated: 'bg-white border border-slate-200/70 shadow-soft-md',
    bordered: 'bg-white border-2 border-slate-200',
    'accent-border': 'bg-white border-l-4 border-l-gov-saffron border-y border-r border-slate-200/80 shadow-soft-sm',
  };

  return (
    <div
      className={twMerge(clsx('rounded-gov-lg p-6 transition-all duration-200', variantStyles[variant], className))}
      {...props}
    >
      {children}
    </div>
  );
};

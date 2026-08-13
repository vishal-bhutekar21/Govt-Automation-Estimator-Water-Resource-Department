import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'navy' | 'teal' | 'saffron' | 'success' | 'warning' | 'danger' | 'slate';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'slate',
  size = 'md',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-wide',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wide',
  };

  const variantStyles = {
    navy: 'bg-gov-navy-50 text-gov-navy border border-gov-navy-200',
    teal: 'bg-gov-teal-50 text-gov-teal-700 border border-gov-teal-200',
    saffron: 'bg-gov-saffron-50 text-gov-saffron-800 border border-gov-saffron-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span
      className={twMerge(clsx('inline-flex items-center rounded-full font-medium', sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};

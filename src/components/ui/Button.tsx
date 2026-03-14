'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_STYLES = {
  primary: {
    background: '#60A5FA',
    color: '#0A0A0F',
    border: 'transparent',
    hover: '#3B82F6',
  },
  secondary: {
    background: 'rgba(96,165,250,0.1)',
    color: '#60A5FA',
    border: 'rgba(96,165,250,0.3)',
    hover: 'rgba(96,165,250,0.2)',
  },
  ghost: {
    background: 'transparent',
    color: '#94A3B8',
    border: 'rgba(42,42,62,0.8)',
    hover: 'rgba(42,42,62,0.5)',
  },
  danger: {
    background: 'rgba(248,113,113,0.1)',
    color: '#F87171',
    border: 'rgba(248,113,113,0.3)',
    hover: 'rgba(248,113,113,0.2)',
  },
  success: {
    background: 'rgba(52,211,153,0.1)',
    color: '#34D399',
    border: 'rgba(52,211,153,0.3)',
    hover: 'rgba(52,211,153,0.2)',
  },
}

const SIZE_STYLES = {
  sm: { padding: '4px 10px', fontSize: '0.75rem', gap: '4px' },
  md: { padding: '6px 14px', fontSize: '0.875rem', gap: '6px' },
  lg: { padding: '10px 20px', fontSize: '1rem', gap: '8px' },
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant]
  const sizeStyle = SIZE_STYLES[size]

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center font-medium rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        background: variantStyle.background,
        color: variantStyle.color,
        border: `1px solid ${variantStyle.border}`,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        gap: sizeStyle.gap,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block rounded-full border-2"
          style={{
            width: '14px',
            height: '14px',
            borderColor: `${variantStyle.color} transparent transparent transparent`,
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : icon}
      {children}
    </button>
  )
}

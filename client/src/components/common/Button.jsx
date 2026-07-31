import React from 'react';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  className = '',
}) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-300 rounded-xl overflow-hidden group';
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-base font-semibold',
  };

  const variants = {
    primary: `
      bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 
      hover:shadow-brand-500/40 hover:-translate-y-0.5 border border-white/10
    `,
    secondary: `
      bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-sm
      hover:border-white/20 hover:-translate-y-0.5 shadow-lg shadow-black/20
    `,
    outline: `
      border border-brand-500/30 text-brand-300 hover:bg-brand-500/10 hover:border-brand-400
      hover:-translate-y-0.5
    `,
    ghost: `
      text-text-secondary hover:text-white hover:bg-white/5
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variants[variant]}
        ${disabled || loading ? 'opacity-60 cursor-not-allowed hover:transform-none hover:shadow-none' : ''}
        ${className}
      `}
    >
      {variant === 'primary' && !disabled && !loading && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
      )}
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
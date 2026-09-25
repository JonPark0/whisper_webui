import { forwardRef } from 'react';

// Figma "Button": Variant × Size × State. Link = PALNARIUM-style text action.
const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle',
  ghost: 'text-ink-2 hover:bg-subtle hover:text-ink',
  danger: 'bg-danger-solid text-on-accent hover:bg-danger-text',
  link: 'text-ink-2 hover:text-ink hover:underline underline-offset-4',
  'link-danger': 'text-danger-text hover:underline underline-offset-4',
  'link-strong': 'text-ink hover:underline underline-offset-4',
};

const SIZES = {
  sm: 'h-8 px-3 gap-1 font-display text-label',
  md: 'h-10 px-4 gap-2 font-sans text-body font-medium',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, type = 'button', ...props },
  ref
) {
  const isLink = variant.startsWith('link');
  const sizeClass = isLink ? 'h-8 font-display text-label' : SIZES[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-md whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

import { forwardRef } from 'react';

const Button = forwardRef(({ className = '', variant, size, type = 'button', ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
  const variantStyles = variant === 'ghost' ? 'hover:bg-slate-100' : 'bg-slate-900 text-white shadow hover:bg-slate-800';
  const sizeStyles = size === 'icon' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-11 px-6 py-3 text-lg' : 'h-9 px-4 py-2 text-sm';

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button };

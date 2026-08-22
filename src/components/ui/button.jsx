import { forwardRef } from 'react';

const Button = forwardRef(({ className = '', variant, size, type = 'button', ...props }, ref) => {
  const baseStyles = 'gold-button focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
  const variantStyles = variant === 'ghost' ? 'gold-button-ghost' : '';
  const sizeStyles = size === 'icon' ? 'h-10 w-10 p-0' : size === 'lg' ? 'h-12 px-6 py-3 text-base' : 'h-10 px-4 py-2 text-sm';

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

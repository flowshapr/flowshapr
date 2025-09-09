import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'btn',
          {
            'btn-primary': variant === 'default',
            'btn-error': variant === 'destructive',
            'btn-outline': variant === 'outline',
            'btn-secondary': variant === 'secondary',
            'btn-ghost': variant === 'ghost',
          },
          {
            'btn-md': size === 'default',
            'btn-sm': size === 'sm',
            'btn-lg': size === 'lg',
            'btn-square btn-sm': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };

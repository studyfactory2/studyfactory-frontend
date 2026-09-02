import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from '../Spinner/Spinner';
import './button.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  full?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger';
};

export function Button({
  children,
  className,
  disabled,
  full = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        full && 'btn--full',
        loading && 'btn--loading',
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...rest}
    >
      {loading && <Spinner size="sm" className="btn__spinner" />}
      <span className="btn__label">{children}</span>
    </button>
  );
}

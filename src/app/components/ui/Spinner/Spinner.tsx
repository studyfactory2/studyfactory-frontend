import { cx } from '../../../lib/cx';
import './spinner.css';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      aria-label="로딩 중"
      className={cx('spinner', `spinner--${size}`, className)}
      role="status"
    />
  );
}

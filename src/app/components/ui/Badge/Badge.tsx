import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import './badge.css';

type BadgeProps = {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  tone?: 'neutral' | 'accent' | 'positive' | 'special' | 'danger';
};

export function Badge({
  children,
  className,
  dot = false,
  tone = 'neutral',
}: BadgeProps) {
  return (
    <span className={cx('ui-badge', `ui-badge--${tone}`, className)}>
      {dot && <i aria-hidden="true" className="ui-badge__dot" />}
      {children}
    </span>
  );
}

import type { ReactNode } from 'react';
import { cx } from '../../../lib/cx';
import './card.css';

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'sm' | 'none';
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <section className={cx('card', `card--pad-${padding}`, className)}>
      {children}
    </section>
  );
}

type CardHeaderProps = {
  aside?: ReactNode;
  title: ReactNode;
};

export function CardHeader({ aside, title }: CardHeaderProps) {
  return (
    <header className="card__header">
      <h3 className="card__title">{title}</h3>
      {aside && <div className="card__aside">{aside}</div>}
    </header>
  );
}

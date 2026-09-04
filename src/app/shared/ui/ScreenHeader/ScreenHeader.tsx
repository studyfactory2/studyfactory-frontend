import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx';
import './screen-header.css';

type ScreenHeaderProps = {
  /** Rendered beside the heading — the study range tabs, for example. */
  actions?: ReactNode;
  backLabel?: string;
  /** Omit on a screen reached from the bottom navigation rather than a menu. */
  backTo?: string;
  eyebrow: string;
  subtitle?: ReactNode;
  title: string;
};

export function ScreenHeader({
  actions,
  backLabel = '더보기',
  backTo,
  eyebrow,
  subtitle,
  title,
}: ScreenHeaderProps) {
  return (
    <header
      className={cx(
        'ui-screen-header',
        actions !== undefined && 'ui-screen-header--split',
      )}
    >
      <div className="ui-screen-header__heading">
        {backTo !== undefined && (
          <Link className="ui-screen-header__back" to={backTo}>
            <ChevronLeft aria-hidden="true" size={16} />
            {backLabel}
          </Link>
        )}
        <p className="ui-screen-header__eyebrow">{eyebrow}</p>
        <h2 className="ui-screen-header__title">{title}</h2>
        {subtitle !== undefined && (
          <p className="ui-screen-header__subtitle">{subtitle}</p>
        )}
      </div>
      {actions}
    </header>
  );
}

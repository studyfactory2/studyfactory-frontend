import type { ReactNode } from 'react';
import './empty-state.css';

type EmptyStateProps = {
  action?: ReactNode;
  description?: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && (
        <div aria-hidden="true" className="empty-state__icon">
          {icon}
        </div>
      )}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

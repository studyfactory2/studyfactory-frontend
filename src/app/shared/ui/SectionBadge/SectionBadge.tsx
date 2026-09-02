import type { ReactNode } from 'react';
import './section-badge.css';

type SectionBadgeProps = {
  children: ReactNode;
};

export function SectionBadge({ children }: SectionBadgeProps) {
  return <span className="section-badge">{children}</span>;
}

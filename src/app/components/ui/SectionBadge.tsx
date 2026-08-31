import type { ReactNode } from 'react';

type SectionBadgeProps = {
  children: ReactNode;
};

export function SectionBadge({ children }: SectionBadgeProps) {
  return <span className="section-badge">{children}</span>;
}

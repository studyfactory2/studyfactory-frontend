import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MoreMenuEntry } from '../model/more.menu';
import '../styles/MoreMenu.css';

export type MoreMenuProps = {
  entries: readonly MoreMenuEntry[];
  /** Rendered as a final cell, so it sizes exactly like a tile. */
  footer?: ReactNode;
};

export function MoreMenu({ entries, footer }: MoreMenuProps) {
  return (
    <div className="member-more__menu">
      {entries.map((entry) => {
        const Icon = entry.icon;

        return (
          <Link className="member-more__tile" key={entry.label} to={entry.to}>
            <span className="member-more__tile-top">
              <span aria-hidden="true" className="member-more__tile-icon">
                <Icon size={17} />
              </span>
              <span className="member-more__tile-group">{entry.group}</span>
            </span>
            <span className="member-more__tile-copy">
              <strong>{entry.label}</strong>
              <small>{entry.description}</small>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="member-more__tile-arrow"
              size={16}
            />
          </Link>
        );
      })}
      {footer}
    </div>
  );
}

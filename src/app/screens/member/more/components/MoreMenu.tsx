import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../../shared/ui';
import type { MoreMenuEntry, MoreMenuGroup } from '../model/more.menu';
import '../styles/MoreMenu.css';

export type MoreMenuProps = {
  groups: readonly MoreMenuGroup[];
};

export function MoreMenu({ groups }: MoreMenuProps) {
  return (
    <div className="member-more__menu">
      {groups.map((group) => (
        <section
          aria-label={group.title}
          className="member-more__menu-group"
          key={group.title}
        >
          <h3>{group.title}</h3>
          <ul>
            {group.entries.map((entry) => (
              <li key={entry.label}>
                <MoreMenuRow entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MoreMenuRow({ entry }: { entry: MoreMenuEntry }) {
  const Icon = entry.icon;
  const body = (
    <>
      <span aria-hidden="true" className="member-more__row-icon">
        <Icon size={18} />
      </span>
      <span className="member-more__row-copy">
        <strong>
          {entry.label}
          {entry.kind === 'pending' && <Badge tone="neutral">준비 중</Badge>}
        </strong>
        <small>{entry.description}</small>
      </span>
      {entry.kind === 'link' && (
        <ChevronRight
          aria-hidden="true"
          className="member-more__row-arrow"
          size={18}
        />
      )}
    </>
  );

  if (entry.kind === 'pending') {
    return (
      <div aria-disabled="true" className="member-more__row is-pending">
        {body}
      </div>
    );
  }

  return (
    <Link className="member-more__row" to={entry.to}>
      {body}
    </Link>
  );
}

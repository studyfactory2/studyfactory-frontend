import { Coffee, LayoutDashboard } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { adminRoutes } from '../../../../core/router/routes';
import { cx } from '../../../../shared/lib/cx';

const ITEMS = [
  {
    end: true,
    icon: LayoutDashboard,
    label: '운영 개요',
    to: adminRoutes.operations,
  },
  {
    end: false,
    icon: Coffee,
    label: '음료 운영',
    to: adminRoutes.operationsBeverages,
  },
] as const;

/** Secondary navigation inside the single primary 운영 destination. */
export function AdminOperationsNav() {
  return (
    <nav aria-label="운영 관리 메뉴" className="admin-operations-nav">
      {ITEMS.map(({ end, icon: Icon, label, to }) => (
        <NavLink
          className={({ isActive }) =>
            cx('admin-operations-nav__item', isActive && 'is-active')
          }
          end={end}
          key={to}
          to={to}
        >
          <Icon aria-hidden="true" size={16} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

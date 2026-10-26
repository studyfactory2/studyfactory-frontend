import { Link } from 'react-router-dom';
import { MORE_MENU_ENTRIES } from '../../more/model/more.menu';
import {
  getHomeBeverageLabel,
  getHomeLeaveLabel,
  type HomeBeverageSummary,
  type HomeLeaveSummary,
} from '../model/home.summary';
import { HomeSectionError } from './HomeSectionState';
import '../styles/HomeQuickNav.css';

export type HomeQuickNavProps = {
  beverage: HomeBeverageSummary & { onRetry: () => void };
  leave: HomeLeaveSummary & { onRetry: () => void };
};

export function HomeQuickNav({ beverage, leave }: HomeQuickNavProps) {
  const captions = {
    beverages: getHomeBeverageLabel(beverage),
    leaves: getHomeLeaveLabel(leave),
    sideDishes: '신청·확인',
  };

  return (
    <div className="member-home__shortcuts">
      <nav aria-label="생활 바로가기" className="member-home__quick-nav">
        {MORE_MENU_ENTRIES.map((link) => {
          const Icon = link.icon;
          const primary = link.id in captions;
          const caption = primary
            ? captions[link.id as keyof typeof captions]
            : null;

          return (
            <Link
              className={`member-home__quick-link${primary ? '' : ' is-secondary'}`}
              key={link.to}
              to={link.to}
            >
              <Icon aria-hidden="true" size={primary ? 19 : 16} />
              <strong>{link.label}</strong>
              {caption !== null && <small>{caption}</small>}
            </Link>
          );
        })}
      </nav>
      {(!beverage.loading && beverage.errorMessage !== null) ||
      (!leave.loading && leave.errorMessage !== null) ? (
        <div className="member-home__shortcut-errors">
          {!beverage.loading && beverage.errorMessage !== null && (
            <HomeSectionError
              message="음료 정보를 불러오지 못했어요."
              onRetry={beverage.onRetry}
            />
          )}
          {!leave.loading && leave.errorMessage !== null && (
            <HomeSectionError
              message={leave.errorMessage}
              onRetry={leave.onRetry}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

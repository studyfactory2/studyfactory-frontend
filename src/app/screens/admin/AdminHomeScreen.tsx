import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminNavigation } from './admin-navigation';
import './styles/admin-home.css';

const cardDetails = [
  {
    description: '사전등록과 현재 사원 현황을 관리해요.',
    eyebrow: 'PEOPLE',
    tone: 'members',
  },
  {
    description: '출석과 현장 요청을 한곳에서 확인해요.',
    eyebrow: 'ATTENDANCE',
    tone: 'attendance',
  },
  {
    description: '출입 QR과 휴무 등 지점 운영 업무를 관리해요.',
    eyebrow: 'OPERATIONS',
    tone: 'operations',
  },
] as const;

export function AdminHomeScreen() {
  return (
    <section className="admin-home">
      <header className="admin-home__hero">
        <div className="admin-home__hero-copy">
          <p className="admin-home__eyebrow">ADMIN HOME</p>
          <h2>오늘의 지점 운영을 확인하세요.</h2>
          <p className="admin-home__description">
            사원과 출석, 운영 현황을 지점 단위로 안전하게 관리하세요.
          </p>
        </div>

        <div aria-hidden="true" className="admin-home__brand">
          <span className="admin-home__brand-mark">
            <img alt="" src="/study-factory-logo.png" />
          </span>
          <span className="admin-home__brand-copy">
            <strong>자격증공장</strong>
            <small>BRANCH OPERATIONS</small>
          </span>
        </div>
      </header>

      <nav aria-label="관리 메뉴" className="admin-home__grid">
        {adminNavigation.slice(1).map((item, index) => {
          const detail = cardDetails[index];

          if (detail === undefined) {
            return null;
          }

          const Icon = item.icon;

          return (
            <Link
              className={`admin-home__card is-${detail.tone}`}
              key={item.to}
              to={item.to}
            >
              <span className="admin-home__card-top">
                <span className="admin-home__card-icon">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <span className="admin-home__card-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </span>

              <span className="admin-home__card-copy">
                <small>{detail.eyebrow}</small>
                <strong>{item.label}</strong>
                <span>{detail.description}</span>
              </span>

              <span className="admin-home__card-action">
                관리하기
                <ArrowUpRight aria-hidden="true" size={17} />
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

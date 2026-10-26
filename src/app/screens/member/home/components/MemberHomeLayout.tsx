import type { ReactNode } from 'react';
import '../styles/MemberHomeScreen.css';

type MemberHomeLayoutProps = {
  presence: ReactNode;
  study: ReactNode;
  shortcuts: ReactNode;
  children: ReactNode;
};

export function MemberHomeLayout({
  presence,
  study,
  shortcuts,
  children,
}: MemberHomeLayoutProps) {
  return (
    <div className="member-home">
      {presence}
      <div className="member-home__body">
        <div className="member-home__overview">
          <div className="member-home__study-panel">{study}</div>
          {shortcuts}
        </div>
        <div className="member-home__content">{children}</div>
      </div>
    </div>
  );
}

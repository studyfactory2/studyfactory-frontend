import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './workspace-screen.css';

export type WorkspaceHomeLink = {
  description: string;
  icon: LucideIcon;
  label: string;
  to: string;
};

type WorkspaceHomeScreenProps = {
  description: string;
  eyebrow: string;
  links: WorkspaceHomeLink[];
  title: string;
};

export function WorkspaceHomeScreen({
  description,
  eyebrow,
  links,
  title,
}: WorkspaceHomeScreenProps) {
  return (
    <section className="workspace-page workspace-home">
      <header className="workspace-page__header">
        <p className="workspace-page__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="workspace-home__grid">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <Link className="workspace-home__card" key={item.to} to={item.to}>
              <span className="workspace-home__card-icon">
                <Icon aria-hidden="true" size={22} />
              </span>
              <span className="workspace-home__card-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="workspace-home__card-arrow"
                size={18}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

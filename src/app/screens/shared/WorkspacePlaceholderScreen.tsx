import { Construction } from 'lucide-react';
import { SectionBadge } from '../../components/ui';
import './workspace-screen.css';

type WorkspacePlaceholderScreenProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function WorkspacePlaceholderScreen({
  description,
  eyebrow,
  title,
}: WorkspacePlaceholderScreenProps) {
  return (
    <section className="workspace-page">
      <header className="workspace-page__header">
        <p className="workspace-page__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="workspace-placeholder">
        <span aria-hidden="true" className="workspace-placeholder__icon">
          <Construction size={24} />
        </span>
        <div>
          <SectionBadge>다음 개발 화면</SectionBadge>
          <h3>화면의 자리를 먼저 준비했어요.</h3>
          <p>
            다음 기능 슬라이스에서 실제 자격증공장 데이터와 작업 흐름을
            연결합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

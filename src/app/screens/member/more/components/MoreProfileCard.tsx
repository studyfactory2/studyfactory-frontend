import { RotateCcw } from 'lucide-react';
import { Spinner } from '../../../../shared/ui';
import '../styles/MoreProfileCard.css';

export type MoreProfileCardProps = {
  branchName: string | null;
  certificationLabel: string | null;
  errorMessage: string | null;
  joinDateLabel: string;
  joinedDayCount: number | null;
  loading: boolean;
  name: string | null;
  onRetry: () => void;
  seatLabel: string;
};

export function MoreProfileCard({
  branchName,
  certificationLabel,
  errorMessage,
  joinDateLabel,
  joinedDayCount,
  loading,
  name,
  onRetry,
  seatLabel,
}: MoreProfileCardProps) {
  if (loading) {
    return (
      <section className="member-more__profile is-plain" role="status">
        <Spinner size="sm" />
        <span>내 정보를 불러오는 중이에요.</span>
      </section>
    );
  }

  if (errorMessage !== null) {
    return (
      <section className="member-more__profile is-plain is-error" role="alert">
        <RotateCcw aria-hidden="true" size={16} />
        <span>{errorMessage}</span>
        <button onClick={onRetry} type="button">
          다시 시도
        </button>
      </section>
    );
  }

  const displayName = name ?? '회원';

  return (
    <section aria-label="내 프로필" className="member-more__profile">
      <div className="member-more__profile-head">
        <span aria-hidden="true" className="member-more__avatar">
          {displayName.slice(0, 1)}
        </span>
        <div className="member-more__identity">
          <strong>{displayName}</strong>
          <small>
            {branchName ?? '소속 지점'} · {seatLabel}
          </small>
        </div>
      </div>

      <dl className="member-more__facts">
        <div>
          <dt>준비 중인 자격증</dt>
          <dd>{certificationLabel ?? '미등록'}</dd>
        </div>
        <div>
          <dt>가입일</dt>
          <dd>
            {joinDateLabel}
            {joinedDayCount !== null && <em>{joinedDayCount}일째</em>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

import { Info, RotateCcw } from 'lucide-react';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  BarSeries,
  Instrument,
  ScreenHeader,
  Spinner,
} from '../../../../shared/ui';
import { useMemberMore } from '../hooks/useMemberMore';
import './styles/MemberProfileScreen.css';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  MEMBER: '회원',
  STAFF: '스텝',
};

export function MemberProfileScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberProfile
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberProfile({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const more = useMemberMore(memberId, queryOwnerKey);
  const { member, profile, stats } = more;

  return (
    <section className="member-profile">
      <ScreenHeader
        backTo={memberRoutes.more}
        eyebrow="MEMBER · PROFILE"
        subtitle="지점에 등록된 내 정보예요."
        title="내 정보"
      />

      <div className="member-profile__split">
        <div className="member-profile__card">
          {profile.loading ? (
            <div className="member-profile__state" role="status">
              <Spinner size="sm" />
              <span>내 정보를 불러오는 중이에요.</span>
            </div>
          ) : profile.errorMessage !== null ? (
            <div className="member-profile__state is-error" role="alert">
              <RotateCcw aria-hidden="true" size={16} />
              <span>{profile.errorMessage}</span>
              <button onClick={profile.onRetry} type="button">
                다시 시도
              </button>
            </div>
          ) : (
            <dl className="member-profile__rows">
              <div>
                <dt>이름</dt>
                <dd>{profile.name ?? '—'}</dd>
              </div>
              <div>
                <dt>소속 지점</dt>
                <dd>{profile.branchName ?? '—'}</dd>
              </div>
              <div>
                <dt>좌석</dt>
                <dd>{profile.seatLabel}</dd>
              </div>
              <div>
                <dt>준비 중인 자격증</dt>
                <dd>{profile.certificationLabel ?? '미등록'}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>
                  {profile.joinDateLabel}
                  {profile.joinedDayCount !== null && (
                    <em>{profile.joinedDayCount}일째</em>
                  )}
                </dd>
              </div>
              <div>
                <dt>계정 등급</dt>
                <dd>
                  {member ? (ROLE_LABELS[member.role] ?? member.role) : '—'}
                </dd>
              </div>
            </dl>
          )}

          <p className="member-profile__note">
            <Info aria-hidden="true" size={14} />
            <span>
              이름, 좌석, 자격증 정보는 지점에서 관리해요. 바꿔야 할 내용이
              있으면 데스크에 문의해 주세요.
            </span>
          </p>
        </div>

        <aside className="member-profile__rail">
          <Instrument
            label="함께한 지"
            note={profile.branchName ?? '소속 지점'}
          >
            <div className="instrument__readout">
              <strong className="instrument__value">
                {profile.joinedDayCount ?? '—'}
                <em>일째</em>
              </strong>
              <span className="instrument__caption">
                {profile.joinDateLabel} 가입
              </span>
            </div>

            <div className="instrument__footer">
              <BarSeries
                caption="최근 7일 인정 학습 시간"
                points={stats.weekPoints}
              />
            </div>
          </Instrument>
        </aside>
      </div>
    </section>
  );
}

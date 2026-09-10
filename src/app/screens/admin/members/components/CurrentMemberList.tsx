import type { MemberResponse } from '../../../../features/members/members-api';
import { cx } from '../../../../shared/lib/cx';
import {
  formatDottedDate,
  splitPreparingCertifications,
  type CertificationLookup,
} from '../model/admin-members';
import {
  CertificationValue,
  LabelledCell,
  ListState,
  NameCell,
  RoleCell,
  SeatCell,
} from './MemberListParts';

type CurrentMemberListProps = {
  certificationLookup: CertificationLookup;
  errorMessage: string | null;
  filterActive: boolean;
  loading: boolean;
  onClearFilter: () => void;
  onRetry: () => void;
  rows: MemberResponse[] | null;
  total: number | null;
};

export function CurrentMemberList({
  certificationLookup,
  errorMessage,
  filterActive,
  loading,
  onClearFilter,
  onRetry,
  rows,
  total,
}: CurrentMemberListProps) {
  return (
    <ListState
      emptyDescription="사전등록 후 회원가입까지 마친 사람이 여기에 보여요."
      emptyTitle="이 지점에 등록된 사원이 아직 없어요."
      errorMessage={errorMessage}
      filterActive={filterActive}
      loading={loading}
      loadingLabel="사원 목록을 불러오는 중"
      noResultTitle="조건에 맞는 사원이 없어요."
      onClearFilter={onClearFilter}
      onRetry={onRetry}
      rows={rows}
      total={total}
    >
      <div className="admin-member-list admin-member-list--current">
        <div aria-hidden="true" className="admin-member-list__head">
          <span>좌석</span>
          <span>이름</span>
          <span>역할</span>
          <span>입회일</span>
          <span>자격증</span>
          <span>준비 중인 자격증</span>
        </div>
        <ul className="admin-member-list__rows">
          {(rows ?? []).map((member) => {
            const preparing = splitPreparingCertifications(
              member.preparingCertifications,
            );

            return (
              <li className="admin-member-list__row" key={member.id}>
                <SeatCell seatNumber={member.seatNumber} />
                <NameCell name={member.name} />
                <RoleCell role={member.role} />
                <span className="admin-member-list__details">
                  <LabelledCell
                    className="admin-member-list__date"
                    label="입회일"
                  >
                    {member.joinDate === null ? (
                      <em className="admin-member-list__muted">미정</em>
                    ) : (
                      formatDottedDate(member.joinDate)
                    )}
                  </LabelledCell>
                  <LabelledCell
                    className="admin-member-list__certification"
                    label="자격증"
                  >
                    <CertificationValue
                      certificationId={member.certificationId}
                      lookup={certificationLookup}
                    />
                  </LabelledCell>
                  <LabelledCell
                    className={cx(
                      'admin-member-list__preparing',
                      preparing.length === 0 && 'is-empty',
                    )}
                    label="준비 중"
                  >
                    {preparing.length === 0 ? (
                      <em className="admin-member-list__muted">—</em>
                    ) : (
                      preparing.join(' · ')
                    )}
                  </LabelledCell>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ListState>
  );
}

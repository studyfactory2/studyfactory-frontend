import type { PreRegistrationResponse } from '../../../../features/members/members-api';
import {
  formatDottedDate,
  summariseBeverages,
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

type PendingRegistrationListProps = {
  certificationLookup: CertificationLookup;
  errorMessage: string | null;
  filterActive: boolean;
  loading: boolean;
  onClearFilter: () => void;
  onRetry: () => void;
  rows: PreRegistrationResponse[] | null;
  total: number | null;
};

export function PendingRegistrationList({
  certificationLookup,
  errorMessage,
  filterActive,
  loading,
  onClearFilter,
  onRetry,
  rows,
  total,
}: PendingRegistrationListProps) {
  return (
    <ListState
      emptyDescription="사전등록을 마치고 아직 가입하지 않은 사람이 여기에 보여요."
      emptyTitle="등록 대기 중인 사람이 없어요."
      errorMessage={errorMessage}
      filterActive={filterActive}
      loading={loading}
      loadingLabel="등록 대기 목록을 불러오는 중"
      noResultTitle="조건에 맞는 등록 대기가 없어요."
      onClearFilter={onClearFilter}
      onRetry={onRetry}
      rows={rows}
      total={total}
    >
      <div className="admin-member-list admin-member-list--pending">
        <div aria-hidden="true" className="admin-member-list__head">
          <span>좌석</span>
          <span>이름</span>
          <span>역할</span>
          <span>입회 예정</span>
          <span>자격증</span>
          <span>음료</span>
        </div>
        <ul className="admin-member-list__rows">
          {(rows ?? []).map((registration) => {
            const beverages = summariseBeverages(
              registration.drinkSetting,
              registration.drinkNotes,
            );

            return (
              <li className="admin-member-list__row" key={registration.id}>
                <SeatCell seatNumber={registration.seatNumber} />
                <NameCell name={registration.name} />
                <RoleCell role={registration.role} />
                <span className="admin-member-list__details">
                  <LabelledCell
                    className="admin-member-list__date"
                    label="입회 예정"
                  >
                    {registration.expectedJoinDate === null ? (
                      <em className="admin-member-list__muted">미정</em>
                    ) : (
                      formatDottedDate(registration.expectedJoinDate)
                    )}
                  </LabelledCell>
                  <LabelledCell
                    className="admin-member-list__certification"
                    label="자격증"
                  >
                    <CertificationValue
                      certificationId={registration.certificationId}
                      lookup={certificationLookup}
                    />
                  </LabelledCell>
                  <LabelledCell
                    className="admin-member-list__beverages"
                    label="음료"
                  >
                    {beverages.length === 0 ? (
                      <em className="admin-member-list__muted">미설정</em>
                    ) : (
                      beverages.map((item) => (
                        <span
                          className="admin-member-list__drink"
                          key={item.name}
                        >
                          {item.name}
                          {item.count > 1 && <small>×{item.count}</small>}
                          {item.note !== null && <small>({item.note})</small>}
                        </span>
                      ))
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

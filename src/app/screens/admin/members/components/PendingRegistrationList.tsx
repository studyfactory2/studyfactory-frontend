import { Pencil, Trash2 } from 'lucide-react';
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
  onDelete: (registration: PreRegistrationResponse) => void;
  onEdit: (registration: PreRegistrationResponse) => void;
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
  onDelete,
  onEdit,
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
          <span>입사 예정일</span>
          <span>자격증</span>
          <span>음료</span>
          <span>관리</span>
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
                    label="입사 예정일"
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
                {/*
                 * Only a pending MEMBER can be changed here: that is the one
                 * role the public signup accepts. A pending 스탭/관리자 row is
                 * shown, and marked as read-only rather than given a control
                 * that would fail.
                 */}
                <span className="admin-member-list__actions">
                  {registration.role === 'MEMBER' ? (
                    <>
                      <button
                        aria-label={`${registration.name} 사전등록 수정`}
                        className="admin-member-list__action"
                        onClick={() => onEdit(registration)}
                        title="수정"
                        type="button"
                      >
                        <Pencil aria-hidden="true" size={15} />
                        <span
                          aria-hidden="true"
                          className="admin-member-list__action-label"
                        >
                          수정
                        </span>
                      </button>
                      <button
                        aria-label={`${registration.name} 사전등록 삭제`}
                        className="admin-member-list__action admin-member-list__action--danger"
                        onClick={() => onDelete(registration)}
                        title="삭제"
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={15} />
                        <span
                          aria-hidden="true"
                          className="admin-member-list__action-label"
                        >
                          삭제
                        </span>
                      </button>
                    </>
                  ) : (
                    <span
                      className="admin-member-list__readonly"
                      title="스탭·관리자 사전등록은 이 화면에서 수정할 수 없어요."
                    >
                      읽기 전용
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ListState>
  );
}

import { useMemo, useState, type CSSProperties } from 'react';
import {
  Armchair,
  DoorOpen,
  MapPin,
  RefreshCw,
  Search,
  Unlink,
} from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';
import {
  Button,
  Card,
  Input,
  Modal,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type {
  StaffSeatCell,
  StaffSeatMember,
  StaffSeatRoom,
  useStaffSeats,
} from '../hooks/useStaffSeats';

type StaffSeats = ReturnType<typeof useStaffSeats>;

type SeatChangeIntent = {
  memberId: number;
  roomName: string | null;
  seatNumber: number | null;
};

export function StaffSeatPanel({ seats }: { seats: StaffSeats }) {
  const [query, setQuery] = useState('');
  const [intent, setIntent] = useState<SeatChangeIntent | null>(null);
  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko');

    if (!normalized) {
      return seats.members;
    }

    return seats.members.filter(
      (member) =>
        member.name.toLocaleLowerCase('ko').includes(normalized) ||
        String(member.seatNumber ?? '').includes(normalized),
    );
  }, [query, seats.members]);

  const selectMember = (member: StaffSeatMember) => {
    seats.onSelectMember(member.id);

    if (member.roomId !== null) {
      seats.onSelectRoom(member.roomId);
    }
  };

  return (
    <>
      <Card className="staff-operations__panel staff-seats" padding="none">
        <header className="staff-operations__panel-header staff-seats__header">
          <div className="staff-operations__panel-title">
            <i aria-hidden="true">
              <Armchair size={19} />
            </i>
            <span>
              <strong>좌석 관리</strong>
              <small>회원을 고른 뒤 빈 좌석을 눌러 배정하거나 옮겨요.</small>
            </span>
          </div>

          <div className="staff-seats__header-actions">
            {!seats.loading && !seats.errorMessage && (
              <dl className="staff-seats__summary" aria-label="좌석 배정 요약">
                <div>
                  <dt>배정</dt>
                  <dd>{seats.assignedCount}</dd>
                </div>
                <div className={seats.unassignedCount > 0 ? 'is-alert' : ''}>
                  <dt>미배정</dt>
                  <dd>{seats.unassignedCount}</dd>
                </div>
                {seats.mapMissingCount > 0 && (
                  <div className="is-warning">
                    <dt>배치도 누락</dt>
                    <dd>{seats.mapMissingCount}</dd>
                  </div>
                )}
              </dl>
            )}
            <button
              aria-label="좌석 정보 새로고침"
              className={cx(
                'staff-operations__refresh',
                seats.refreshing && 'is-refreshing',
              )}
              disabled={seats.loading || seats.refreshing}
              onClick={seats.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={17} />
            </button>
          </div>
        </header>

        {seats.loading ? (
          <SectionLoading label="회원과 좌석 배치를 불러오는 중이에요." />
        ) : seats.errorMessage ? (
          <SectionError
            message={seats.errorMessage}
            onRetry={seats.onRefresh}
          />
        ) : (
          <div className="staff-seats__workspace">
            <aside className="staff-seats__members">
              <label className="staff-seats__search">
                <Search aria-hidden="true" size={16} />
                <Input
                  aria-label="회원 이름 또는 좌석 번호 검색"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="이름 또는 좌석 번호"
                  value={query}
                />
              </label>

              {seats.selectedMember && (
                <SelectedMemberCard
                  member={seats.selectedMember}
                  onRelease={() => {
                    const member = seats.selectedMember;

                    if (member === null) {
                      return;
                    }

                    setIntent({
                      memberId: member.id,
                      roomName: member.roomName,
                      seatNumber: null,
                    });
                  }}
                  pending={seats.assignment.pending}
                />
              )}

              <div className="staff-seats__member-list-head">
                <strong>회원</strong>
                <span>{filteredMembers.length}명</span>
              </div>

              {filteredMembers.length === 0 ? (
                <p className="staff-seats__member-empty">
                  {seats.members.length === 0
                    ? '배정할 회원이 없어요.'
                    : '검색 결과가 없어요.'}
                </p>
              ) : (
                <ul
                  aria-label="좌석 배정 회원"
                  className="staff-seats__member-list"
                >
                  {filteredMembers.map((member) => (
                    <li key={member.id}>
                      <button
                        aria-pressed={seats.selectedMember?.id === member.id}
                        className={cx(
                          'staff-seats__member',
                          seats.selectedMember?.id === member.id &&
                            'is-selected',
                          member.assignmentState === 'map-missing' &&
                            'is-map-missing',
                        )}
                        disabled={seats.assignment.pending}
                        onClick={() => selectMember(member)}
                        type="button"
                      >
                        <span className="staff-seats__member-seat">
                          {member.seatNumber !== null && member.seatNumber > 0
                            ? member.seatNumber
                            : '—'}
                        </span>
                        <span>
                          <strong>{member.name}</strong>
                          <small>{formatMemberLocation(member)}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <section className="staff-seats__map-area">
              <header className="staff-seats__map-toolbar">
                <div
                  aria-label="작업실 선택"
                  className="staff-seats__room-tabs"
                  role="group"
                >
                  {seats.rooms.map((room) => (
                    <button
                      aria-pressed={room.id === seats.selectedRoom?.id}
                      className={cx(
                        room.id === seats.selectedRoom?.id && 'is-active',
                      )}
                      disabled={seats.assignment.pending}
                      key={room.id}
                      onClick={() => seats.onSelectRoom(room.id)}
                      type="button"
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
                <p>
                  {seats.selectedMember
                    ? `${seats.selectedMember.name} 회원에게 배정할 빈 좌석을 눌러 주세요.`
                    : '먼저 회원 또는 사용 중인 좌석을 선택해 주세요.'}
                </p>
              </header>

              {seats.selectedRoom ? (
                <SeatMap
                  onAssign={(room, seatNumber) => {
                    if (seats.selectedMember === null) {
                      return;
                    }

                    setIntent({
                      memberId: seats.selectedMember.id,
                      roomName: room.name,
                      seatNumber,
                    });
                  }}
                  onSelectMember={selectMember}
                  pending={seats.assignment.pending}
                  room={seats.selectedRoom}
                  selectedMemberId={seats.selectedMember?.id ?? null}
                />
              ) : (
                <SectionEmpty title="등록된 작업실이 없어요.">
                  <p>좌석 배치도는 관리자 화면에서 먼저 등록해 주세요.</p>
                </SectionEmpty>
              )}
            </section>
          </div>
        )}
      </Card>

      <SeatConfirmation
        intent={intent}
        members={seats.members}
        onClose={() => setIntent(null)}
        onConfirm={(memberId, seatNumber) => {
          void seats.assignment
            .onSubmit(memberId, seatNumber)
            .then(() => setIntent(null))
            .catch(() => undefined);
        }}
        pending={seats.assignment.pending}
      />
    </>
  );
}

function SelectedMemberCard({
  member,
  onRelease,
  pending,
}: {
  member: StaffSeatMember;
  onRelease: () => void;
  pending: boolean;
}) {
  return (
    <div className="staff-seats__selected">
      <span>
        <small>선택한 회원</small>
        <strong>{member.name}</strong>
        <em className={`is-${member.assignmentState}`}>
          {formatMemberLocation(member)}
        </em>
      </span>
      {member.seatNumber !== null && member.seatNumber > 0 && (
        <button disabled={pending} onClick={onRelease} type="button">
          <Unlink aria-hidden="true" size={14} />
          해제
        </button>
      )}
    </div>
  );
}

function SeatMap({
  onAssign,
  onSelectMember,
  pending,
  room,
  selectedMemberId,
}: {
  onAssign: (room: StaffSeatRoom, seatNumber: number) => void;
  onSelectMember: (member: StaffSeatMember) => void;
  pending: boolean;
  room: StaffSeatRoom;
  selectedMemberId: number | null;
}) {
  return (
    <div className="staff-seats__floor">
      <div
        aria-label={`${room.name} 좌석 배치도`}
        className="staff-seats__grid"
        role="group"
        style={
          {
            '--staff-seats-min-width': `${
              room.cols * 62 + Math.max(0, room.cols - 1) * 5
            }px`,
            gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${room.rows}, minmax(var(--staff-seats-aisle), auto))`,
          } as CSSProperties
        }
      >
        {room.cells.map((cell) => (
          <SeatCell
            cell={cell}
            key={`${room.id}-${cell.item.id}`}
            onAssign={(seatNumber) => onAssign(room, seatNumber)}
            onSelectMember={onSelectMember}
            pending={pending}
            selectedMemberId={selectedMemberId}
          />
        ))}
      </div>
    </div>
  );
}

function SeatCell({
  cell,
  onAssign,
  onSelectMember,
  pending,
  selectedMemberId,
}: {
  cell: StaffSeatCell;
  onAssign: (seatNumber: number) => void;
  onSelectMember: (member: StaffSeatMember) => void;
  pending: boolean;
  selectedMemberId: number | null;
}) {
  const position = { gridColumn: cell.item.x, gridRow: cell.item.y };

  if (cell.item.type === 'DOOR') {
    return (
      <div className="staff-seats__cell is-door" style={position}>
        <DoorOpen aria-hidden="true" size={15} />
        <span>문</span>
      </div>
    );
  }

  const seatNumber = cell.item.number;
  const selected = cell.member?.id === selectedMemberId;

  return (
    <button
      aria-label={
        cell.member
          ? `${seatNumber}번, ${cell.member.name} 회원 사용 중, 회원 선택`
          : `${seatNumber ?? '번호 없는'} 좌석, 공석${
              selectedMemberId === null ? ', 회원을 먼저 선택하세요' : ', 배정'
            }`
      }
      aria-pressed={selected}
      className={cx(
        'staff-seats__cell',
        cell.member ? 'is-occupied' : 'is-vacant',
        selected && 'is-selected',
        pending && 'is-pending',
      )}
      disabled={
        pending ||
        (cell.member === null &&
          (seatNumber === null || selectedMemberId === null))
      }
      onClick={() => {
        if (cell.member) {
          onSelectMember(cell.member);
        } else if (seatNumber !== null && selectedMemberId !== null) {
          onAssign(seatNumber);
        }
      }}
      style={position}
      type="button"
    >
      <span>{seatNumber ?? '?'}</span>
      {cell.member ? <strong>{cell.member.name}</strong> : <small>공석</small>}
    </button>
  );
}

function SeatConfirmation({
  intent,
  members,
  onClose,
  onConfirm,
  pending,
}: {
  intent: SeatChangeIntent | null;
  members: StaffSeatMember[];
  onClose: () => void;
  onConfirm: (memberId: number, seatNumber: number | null) => void;
  pending: boolean;
}) {
  const member = members.find((candidate) => candidate.id === intent?.memberId);

  return (
    <Modal
      closeDisabled={pending}
      footer={
        intent && member ? (
          <>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              취소
            </Button>
            <Button
              loading={pending}
              onClick={() => onConfirm(member.id, intent.seatNumber)}
              variant={intent.seatNumber === null ? 'danger' : 'primary'}
            >
              {intent.seatNumber === null ? '좌석 해제' : '배정 확정'}
            </Button>
          </>
        ) : undefined
      }
      onClose={onClose}
      open={intent !== null && member !== undefined}
      size="sm"
      title={intent?.seatNumber === null ? '좌석 해제 확인' : '좌석 배정 확인'}
    >
      {intent && member && (
        <div className="staff-seats__confirmation">
          <span aria-hidden="true">
            {intent.seatNumber === null ? (
              <Unlink size={20} />
            ) : (
              <MapPin size={20} />
            )}
          </span>
          <div>
            <strong>{member.name}</strong>
            {intent.seatNumber === null ? (
              <p>
                {formatMemberLocation(member)} 배정을 해제할까요? 회원은 미배정
                목록으로 이동합니다.
              </p>
            ) : (
              <p>
                {member.seatNumber !== null && member.seatNumber > 0
                  ? `${formatMemberLocation(member)}에서 `
                  : ''}
                {intent.roomName} {intent.seatNumber}번 좌석으로
                {member.seatNumber !== null && member.seatNumber > 0
                  ? ' 옮길까요?'
                  : ' 배정할까요?'}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function formatMemberLocation(member: StaffSeatMember) {
  if (member.assignmentState === 'unassigned') {
    return '좌석 미배정';
  }

  if (member.assignmentState === 'map-missing') {
    return `${member.seatNumber}번 · 배치도 누락`;
  }

  return `${member.roomName} · ${member.seatNumber}번`;
}

import type { CSSProperties } from 'react';
import { DoorOpen, Pencil } from 'lucide-react';
import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../shared/ui';
import { cx } from '../../../shared/lib/cx';
import { formatDrinkList } from '../model/manager-beverages';
import type { RoomCell, RoomView } from '../model/manager-beverages';

type BeverageRoomMapProps = {
  errorMessage: string | null;
  loading: boolean;
  onOpenEditor: (memberId: number) => void;
  onRetry: () => void;
  onSelect: (roomId: number) => void;
  rooms: RoomView[];
  selected: RoomView | null;
};

export function BeverageRoomMap({
  errorMessage,
  loading,
  onOpenEditor,
  onRetry,
  onSelect,
  rooms,
  selected,
}: BeverageRoomMapProps) {
  return (
    <Card className="staff-bev__card staff-bev__map-card" padding="sm">
      <CardHeader
        aside={
          rooms.length > 1 && (
            <div
              aria-label="작업실 선택"
              className="staff-bev__room-tabs"
              role="group"
            >
              {rooms.map((room) => (
                <button
                  aria-pressed={room.id === selected?.id}
                  className={cx(
                    `is-${room.tone}`,
                    room.id === selected?.id && 'is-active',
                  )}
                  key={room.id}
                  onClick={() => onSelect(room.id)}
                  type="button"
                >
                  {room.name}
                </button>
              ))}
            </div>
          )
        }
        title="서빙 좌석표"
      />
      <div className="staff-bev__map-toolbar">
        <p className="staff-bev__map-hint">
          좌석을 누르면 음료를 바로 고칠 수 있어요.
          <span className="staff-bev__map-swipe-hint">
            작은 화면에서는 좌우로 밀어 전체 좌석을 볼 수 있어요.
          </span>
        </p>
        {!loading && !errorMessage && selected && <BeverageLegend />}
      </div>

      {loading ? (
        <SectionLoading label="좌석 배치를 불러오는 중" />
      ) : errorMessage ? (
        <SectionError message={errorMessage} onRetry={onRetry} />
      ) : !selected ? (
        <SectionEmpty title="등록된 작업실이 없어요." />
      ) : (
        <>
          {/*
            The floor carries the room's colour, so flipping rooms changes the
            whole card and nobody serves 2작업실 from the 1작업실 sheet. Rows
            with no seat in them are aisles and collapse to the aisle height.
          */}
          <div
            aria-label={`${selected.name} 서빙 좌석표`}
            className={cx('staff-bev__floor', `is-${selected.tone}`)}
            role="region"
            tabIndex={0}
          >
            <div
              className="staff-bev__grid"
              style={
                {
                  '--staff-bev-mobile-min-width': `${
                    selected.cols * 44 + Math.max(0, selected.cols - 1) * 3
                  }px`,
                  gridTemplateColumns: `repeat(${selected.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${selected.rows}, minmax(var(--staff-bev-aisle), auto))`,
                } as CSSProperties
              }
            >
              {selected.cells.map((cell) => (
                <RoomCellView
                  cell={cell}
                  key={cell.key}
                  onOpenEditor={onOpenEditor}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function BeverageLegend() {
  return (
    <ul aria-label="좌석 상태 범례" className="staff-bev__legend">
      <li>
        <i aria-hidden="true" className="is-drink" />
        음료 있음
      </li>
      <li>
        <i aria-hidden="true" className="is-away" />
        오전 휴무
      </li>
      <li>
        <i aria-hidden="true" className="is-seat" />
        음료 없음
      </li>
      <li>
        <i aria-hidden="true" className="is-vacant" />
        공석
      </li>
      <li>
        <span aria-hidden="true" className="staff-bev__tumbler-badge">
          텀
        </span>
        텀블러
      </li>
    </ul>
  );
}

function RoomCellView({
  cell,
  onOpenEditor,
}: {
  cell: RoomCell;
  onOpenEditor: (memberId: number) => void;
}) {
  const { item } = cell;
  const position = { gridColumn: item.x, gridRow: item.y };

  if (item.type === 'DOOR') {
    return (
      <div className="staff-bev__cell is-door" style={position}>
        <DoorOpen aria-hidden="true" size={14} />
        <span>문</span>
      </div>
    );
  }

  const hasDrinks = cell.drinks.length > 0;
  const className = cx(
    'staff-bev__cell',
    cell.memberName === null && 'is-vacant',
    cell.memberName !== null && !hasDrinks && 'is-seat',
    hasDrinks && !cell.away && 'is-drink',
    hasDrinks && cell.away && 'is-away',
  );
  const content = (
    <>
      <span className="staff-bev__cell-top">
        <span className="staff-bev__cell-seat">{item.number}</span>
        {cell.tumbler && (
          <span
            aria-hidden="true"
            className="staff-bev__tumbler-badge staff-bev__cell-tumbler"
          >
            텀
          </span>
        )}
      </span>
      {cell.memberName && (
        <span className="staff-bev__cell-name">{cell.memberName}</span>
      )}
      {hasDrinks && (
        <span className="staff-bev__cell-drinks">
          {cell.away ? '오전 휴무' : formatDrinkList(cell.drinks)}
        </span>
      )}
      {cell.notes.length > 0 && !cell.away && (
        <span className="staff-bev__cell-note">{cell.notes.join(', ')}</span>
      )}
    </>
  );

  /*
   * A vacant seat is not a button: assigning someone to it is 좌석 관리, which
   * is a different job and lands with 운영. A seat with a member opens that
   * member's drinks, whether or not they have any yet.
   */
  if (cell.memberId === null) {
    return (
      <div
        aria-label={`${item.number}번 공석`}
        className={className}
        role="img"
        style={position}
      >
        {content}
      </div>
    );
  }

  const memberId = cell.memberId;

  return (
    <button
      aria-label={`${item.number}번 ${cell.memberName}, ${
        hasDrinks
          ? cell.away
            ? '오전 휴무'
            : formatDrinkList(cell.drinks)
          : '음료 없음'
      }${cell.tumbler ? ', 텀블러' : ''}${
        cell.notes.length > 0 && !cell.away
          ? `, 메모 ${cell.notes.join(', ')}`
          : ''
      }, 음료 편집`}
      className={className}
      onClick={() => onOpenEditor(memberId)}
      style={position}
      type="button"
    >
      {content}
      {/* Shown on hover where there is a pointer; the hint line covers touch. */}
      <Pencil aria-hidden="true" className="staff-bev__cell-pen" size={11} />
    </button>
  );
}

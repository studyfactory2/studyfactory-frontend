import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import { formatDrinkList } from '../model/staff-beverages';
import type { RoomCell, RoomView } from '../model/staff-beverages';

type BeverageRoomMapProps = {
  errorMessage: string | null;
  loading: boolean;
  onOpenEditor: (memberId: number) => void;
  onRetry: () => void;
  onSelect: (roomId: number) => void;
  rooms: RoomView[];
  selected: RoomView | null;
  unseated: Array<{
    away: boolean;
    drinks: string[];
    memberId: number;
    memberName: string;
    staff: boolean;
  }>;
};

export function BeverageRoomMap({
  errorMessage,
  loading,
  onOpenEditor,
  onRetry,
  onSelect,
  rooms,
  selected,
  unseated,
}: BeverageRoomMapProps) {
  return (
    <Card className="staff-bev__card staff-bev__map-card">
      <CardHeader
        aside={
          rooms.length > 1 && (
            <div className="staff-bev__room-tabs" role="tablist">
              {rooms.map((room) => (
                <button
                  aria-selected={room.id === selected?.id}
                  className={cx(room.id === selected?.id && 'is-active')}
                  key={room.id}
                  onClick={() => onSelect(room.id)}
                  role="tab"
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

      {/*
        Above the grid, not below it: the real room is fourteen rows tall, and
        a drinker with no seat must not be the thing you find after a scroll.
      */}
      {unseated.length > 0 && (
        <ul className="staff-bev__unseated">
          {unseated.map((member) => (
            <li className={cx(member.away && 'is-away')} key={member.memberId}>
              <button
                className="staff-bev__unseated-open"
                onClick={() => onOpenEditor(member.memberId)}
                type="button"
              >
                <span className="staff-bev__tag">좌석 없음</span>
                <span className="staff-bev__unseated-name">
                  {member.memberName}
                  {member.staff && (
                    <>
                      {' '}
                      <span className="staff-bev__role">스텝</span>
                    </>
                  )}
                </span>
                <span className="staff-bev__alert-detail">
                  {member.away ? '오전 휴무' : formatDrinkList(member.drinks)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <SectionLoading label="좌석 배치를 불러오는 중" />
      ) : errorMessage ? (
        <SectionError message={errorMessage} onRetry={onRetry} />
      ) : !selected ? (
        <SectionEmpty title="등록된 작업실이 없어요." />
      ) : (
        <>
          <ul className="staff-bev__legend">
            <li>
              <i className="is-drink" />
              음료 있음
            </li>
            <li>
              <i className="is-away" />
              오전 휴무
            </li>
            <li>
              <i className="is-seat" />
              음료 없음
            </li>
            <li>
              <i className="is-vacant" />
              공석
            </li>
            <li>
              <span className="staff-bev__tumbler-badge">텀</span>
              텀블러
            </li>
          </ul>

          {/*
            Rows with no seat in them are aisles. They collapse to the aisle
            height so the room keeps its shape without stretching the map.
          */}
          <div
            className="staff-bev__grid"
            style={{
              gridTemplateColumns: `repeat(${selected.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${selected.rows}, minmax(var(--staff-bev-aisle), auto))`,
            }}
          >
            {selected.cells.map((cell) => (
              <RoomCellView
                cell={cell}
                key={cell.key}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </div>
        </>
      )}
    </Card>
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
        문
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
            aria-label="텀블러"
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
          {formatDrinkList(cell.drinks)}
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
      <div className={className} style={position}>
        {content}
      </div>
    );
  }

  const memberId = cell.memberId;

  return (
    <button
      aria-label={`${item.number}번 ${cell.memberName} 음료 편집`}
      className={className}
      onClick={() => onOpenEditor(memberId)}
      style={position}
      type="button"
    >
      {content}
    </button>
  );
}

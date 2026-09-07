import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import type { RoomCell, RoomView } from '../model/staff-beverages';

type BeverageRoomMapProps = {
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  onSelect: (roomId: number) => void;
  rooms: RoomView[];
  selected: RoomView | null;
  unseated: Array<{
    away: boolean;
    drinks: string[];
    memberId: number;
    memberName: string;
  }>;
};

export function BeverageRoomMap({
  errorMessage,
  loading,
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

      {loading ? (
        <SectionLoading label="좌석 배치를 불러오는 중" />
      ) : errorMessage ? (
        <SectionError message={errorMessage} onRetry={onRetry} />
      ) : !selected ? (
        <SectionEmpty title="등록된 작업실이 없어요." />
      ) : (
        <>
          <div
            className="staff-bev__grid"
            style={{
              gridTemplateColumns: `repeat(${selected.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${selected.rows}, minmax(46px, auto))`,
            }}
          >
            {selected.cells.map((cell) => (
              <RoomCellView cell={cell} key={cell.key} />
            ))}
          </div>

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
          </ul>
        </>
      )}

      {unseated.length > 0 && (
        <div className="staff-bev__unseated">
          <p className="staff-bev__section-note">
            좌석이 없어 배치도에 표시되지 않는 회원이에요.
          </p>
          <ul>
            {unseated.map((member) => (
              <li
                className={cx(member.away && 'is-away')}
                key={member.memberId}
              >
                <span>{member.memberName}</span>
                <span className="staff-bev__alert-detail">
                  {member.away ? '오전 휴무' : member.drinks.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function RoomCellView({ cell }: { cell: RoomCell }) {
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

  return (
    <div
      className={cx(
        'staff-bev__cell',
        cell.memberName === null && 'is-vacant',
        cell.memberName !== null && !hasDrinks && 'is-seat',
        hasDrinks && !cell.away && 'is-drink',
        hasDrinks && cell.away && 'is-away',
      )}
      style={position}
    >
      <span className="staff-bev__cell-seat">{item.number}</span>
      {cell.memberName && (
        <span className="staff-bev__cell-name">{cell.memberName}</span>
      )}
      {hasDrinks && (
        <span className="staff-bev__cell-drinks">{cell.drinks.join(', ')}</span>
      )}
      {cell.notes.length > 0 && !cell.away && (
        <span className="staff-bev__cell-note">{cell.notes.join(', ')}</span>
      )}
    </div>
  );
}

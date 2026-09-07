import {
  Dial,
  Instrument,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { formatShiftLabel, type ShiftSummary } from '../model/staff-home';
import type { useStaffHome } from '../hooks/useStaffHome';

type StaffHomeHeroProps = {
  room: ReturnType<typeof useStaffHome>['room'];
  shifts: ShiftSummary & {
    errorMessage: string | null;
    loading: boolean;
  };
};

export function StaffHomeHero({ room, shifts }: StaffHomeHeroProps) {
  return (
    <Instrument
      label="지금 지점"
      note={room.asOfLabel ? `${room.asOfLabel} 기준` : undefined}
    >
      {room.loading ? (
        <SectionLoading label="현재 착석 현황을 불러오는 중" />
      ) : room.errorMessage ? (
        <SectionError message={room.errorMessage} onRetry={room.onRetry} />
      ) : (
        <div className="staff-home__hero">
          {room.ratio === null ? null : (
            <Dial
              caption={
                room.ratio > 1 ? '100%+' : `${Math.round(room.ratio * 100)}%`
              }
              label="착석률"
              size={104}
              value={room.ratio}
            />
          )}

          <p className="staff-home__figure">
            <span className="staff-home__figure-key">지금 착석</span>
            <strong>
              {room.seatedCount}
              <small>명</small>
            </strong>
            <span className="staff-home__figure-facts">
              <span>
                나와야 할 <b>{room.expectedCount}명</b>
              </span>
              <span>
                미착석 <b>{room.notSeatedCount}명</b>
              </span>
              {room.onLeaveCount > 0 && (
                <span>
                  휴무 <b>{room.onLeaveCount}명</b>
                </span>
              )}
            </span>
          </p>

          <StaffHomeShift shifts={shifts} />
        </div>
      )}
    </Instrument>
  );
}

function StaffHomeShift({ shifts }: Pick<StaffHomeHeroProps, 'shifts'>) {
  return (
    <div className="staff-home__shift">
      <span className="staff-home__figure-key">오늘 내 근무</span>
      {shifts.loading ? (
        <span className="staff-home__shift-quiet">불러오는 중</span>
      ) : shifts.errorMessage ? (
        <span className="staff-home__shift-quiet">
          근무표를 불러오지 못했어요
        </span>
      ) : shifts.today.length > 0 ? (
        <>
          <strong className="staff-home__shift-now">
            {shifts.today.map(formatShiftLabel).join(' · ')}
          </strong>
          {shifts.week.length > shifts.today.length && (
            <span className="staff-home__shift-quiet">
              이번 주 {shifts.week.length}회
            </span>
          )}
        </>
      ) : (
        <>
          <strong className="staff-home__shift-now">근무 없음</strong>
          {/*
            The schedule stores a typed name, not a member reference, so a
            staff member whose name was entered differently would silently see
            "근무 없음" forever. Saying so is better than quietly showing
            nothing.
          */}
          <span className="staff-home__shift-quiet">
            {shifts.unmatched
              ? '근무표에 내 이름이 없어요'
              : '오늘은 배정이 없어요'}
          </span>
        </>
      )}
    </div>
  );
}

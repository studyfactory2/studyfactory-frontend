import { ArrowLeft, NotebookPen } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { memberRoutes } from '../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import { MemberTaskDayCard } from '../../../features/member-tasks/MemberTaskDayCard';
import {
  getMemberTaskDraftDates,
  getMemberTaskDraftDateSnapshot,
  subscribeMemberTaskDraftDates,
} from '../../../features/member-tasks/member-task-drafts';
import { isMemberTaskDate } from '../../../features/member-tasks/member-tasks-api';
import { useMemberTaskCalendar } from '../../../features/member-tasks/useMemberTaskCalendar';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import { MemberTaskCalendar } from './components/MemberTaskCalendar';
import './styles/MemberTasksScreen.css';

export function MemberTasksScreen() {
  const { memberId, ownerKey } = useSession();
  if (memberId === null || ownerKey === null) return null;
  return (
    <MemberTasksWorkspace
      key={ownerKey}
      memberId={memberId}
      ownerKey={ownerKey}
    />
  );
}

function MemberTasksWorkspace({
  memberId,
  ownerKey,
}: {
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const { dateKey: today } = useSeoulToday();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date');
  const invalidDate =
    requestedDate !== null && !isMemberTaskDate(requestedDate);
  const selectedDate = requestedDate && !invalidDate ? requestedDate : today;
  const month = selectedDate.slice(0, 7);
  const calendar = useMemberTaskCalendar({ memberId, ownerKey, month });
  useSyncExternalStore(
    subscribeMemberTaskDraftDates,
    getMemberTaskDraftDateSnapshot,
  );
  const draftDates = getMemberTaskDraftDates(memberId).filter(isMemberTaskDate);

  function selectDate(date: string) {
    if (!isMemberTaskDate(date) || date === selectedDate) return;
    const next = new URLSearchParams(searchParams);
    next.set('date', date);
    // Navigation never saves or discards a draft. Each editor keeps its own date key.
    setSearchParams(next);
  }

  function goToday() {
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    setSearchParams(next);
  }

  function selectMonth(nextMonth: string) {
    if (!isMemberTaskDate(`${nextMonth}-01`)) return;
    const [year, monthNumber] = nextMonth.split('-').map(Number);
    // Date.UTC maps years 0–99 to 1900–1999. setUTCFullYear preserves the API year.
    const lastDay = new Date(0);
    lastDay.setUTCHours(0, 0, 0, 0);
    lastDay.setUTCFullYear(year, monthNumber, 0);
    const day = Math.min(
      Number(selectedDate.slice(8, 10)),
      lastDay.getUTCDate(),
    );
    selectDate(`${nextMonth}-${String(day).padStart(2, '0')}`);
  }

  return (
    <section className="member-tasks-page" aria-labelledby="member-tasks-title">
      <header className="member-tasks-page__header">
        <Link className="member-tasks-page__back" to={memberRoutes.home}>
          <ArrowLeft aria-hidden="true" size={17} /> 홈으로
        </Link>
        <div className="member-tasks-page__intro">
          <span aria-hidden="true">
            <NotebookPen size={20} />
          </span>
          <div>
            <h2 id="member-tasks-title">할 일 기록</h2>
            <p>날짜를 골라 메모하고, 완료한 일을 확인해요.</p>
          </div>
        </div>
      </header>
      {invalidDate && (
        <p className="member-tasks-page__notice" role="status">
          날짜를 확인할 수 없어 오늘의 할 일을 보여드려요.
        </p>
      )}
      {draftDates.length > 0 && (
        <div className="member-tasks-page__recovery">
          <label htmlFor="member-task-recovery">
            이 기기에 보관 중인 초안 <strong>{draftDates.length}일</strong>
          </label>
          <select
            id="member-task-recovery"
            value={draftDates.includes(selectedDate) ? selectedDate : ''}
            onChange={(event) => selectDate(event.target.value)}
          >
            <option disabled value="">
              작성하던 날짜로 이동
            </option>
            {draftDates.map((date) => (
              <option key={date} value={date}>
                {date.replaceAll('-', '.')} {date === today ? '· 오늘' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="member-tasks-page__body">
        <MemberTaskCalendar
          days={calendar.data?.month === month ? calendar.data.days : undefined}
          draftDates={draftDates}
          errorMessage={
            calendar.isError
              ? '달력의 할 일 개수를 불러오지 못했어요. 날짜별 작성 내용은 그대로 유지돼요.'
              : null
          }
          loading={calendar.isPending}
          month={month}
          onDateChange={selectDate}
          onMonthChange={selectMonth}
          onRefresh={() => {
            void calendar.refetch();
          }}
          onToday={goToday}
          refreshing={calendar.isFetching}
          selectedDate={selectedDate}
          today={today}
        />
        <MemberTaskDayCard
          date={selectedDate}
          key={`${ownerKey}:${selectedDate}`}
          memberId={memberId}
          onDateChange={selectDate}
          ownerKey={ownerKey}
          showRecovery={false}
          title={selectedDate === today ? '오늘의 할일' : '날짜별 할 일'}
          today={today}
        />
      </div>
    </section>
  );
}

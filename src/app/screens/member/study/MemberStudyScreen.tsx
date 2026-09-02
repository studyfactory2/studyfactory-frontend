import { useSession, type SessionOwnerKey } from '../../../core/session';
import { StudyDayDetail } from './components/StudyDayDetail';
import { StudyHero } from './components/StudyHero';
import { StudyRangeTabs } from './components/StudyRangeTabs';
import { StudyRecordList } from './components/StudyRecordList';
import { StudyRecordTable } from './components/StudyRecordTable';
import {
  StudySectionEmpty,
  StudySectionError,
  StudySectionLoading,
} from './components/StudySectionState';
import { StudySummary } from './components/StudySummary';
import { useMemberStudy } from './hooks/useMemberStudy';
import { formatDateRange } from './model/study.dates';
import { getRangeLabel } from './model/study.labels';
import './styles/MemberStudyScreen.css';

export function MemberStudyScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberStudyReport
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberStudyReport({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const study = useMemberStudy(memberId, queryOwnerKey);
  const { dateRange, presenceHistory, report, rows } = study;

  const recordsLoading = report.loading || presenceHistory.loading;
  const recordsError = report.errorMessage ?? presenceHistory.errorMessage;
  const recordsEmpty =
    !recordsLoading &&
    recordsError === null &&
    rows.every((row) => row.status === 'none' || row.status === 'future');

  const retryRecords = () => {
    report.onRetry();
    presenceHistory.onRetry();
  };

  return (
    <div className="member-study">
      <header className="member-study__header">
        <div className="member-study__heading">
          <p className="member-study__eyebrow">MEMBER · STUDY</p>
          <h2 className="member-study__title">공부 시간 리포트</h2>
          <p className="member-study__subtitle">
            {formatDateRange(dateRange.from, dateRange.to)} · 서울 기준
          </p>
        </div>
        <StudyRangeTabs onSelect={study.onSetRange} value={study.range} />
      </header>

      <div className="member-study__primary">
        <StudyHero
          breakSeconds={study.summary.breakSeconds}
          dateRangeLabel={formatDateRange(dateRange.from, dateRange.to)}
          errorMessage={report.errorMessage}
          isLive={study.isLive}
          loading={report.loading}
          maxDaySeconds={study.summary.maxDaySeconds}
          onRetry={report.onRetry}
          onSelectDate={study.onSelectDate}
          periodSeconds={study.summary.periodSeconds}
          range={study.range}
          rangeLabel={getRangeLabel(study.range)}
          rows={rows}
          selectedDateKey={study.selectedDateKey}
          totalSeconds={study.summary.totalSeconds}
        />

        {!report.loading && report.errorMessage === null && (
          <StudySummary
            attendedDayCount={study.summary.attendedDayCount}
            averageSecondsPerAttendedDay={
              study.summary.averageSecondsPerAttendedDay
            }
            breakSeconds={study.summary.breakSeconds}
            periodSeconds={study.summary.periodSeconds}
          />
        )}

        <section
          aria-labelledby="member-study-records-title"
          className="member-study__card"
        >
          <header className="member-study__card-header">
            <h3 id="member-study-records-title">기록</h3>
            <span>{getRangeLabel(study.range)} 일별 인정 시간</span>
          </header>

          {recordsLoading ? (
            <StudySectionLoading label="기록을 불러오는 중이에요." />
          ) : recordsError !== null ? (
            <StudySectionError message={recordsError} onRetry={retryRecords} />
          ) : recordsEmpty ? (
            <StudySectionEmpty title="아직 기록이 없어요">
              <p>출입문 QR로 입실하면 이곳에 학습 시간이 쌓여요.</p>
            </StudySectionEmpty>
          ) : (
            <>
              <StudyRecordTable
                onSelectDate={study.onSelectDate}
                rows={rows}
                selectedDateKey={study.selectedDateKey}
              />
              <StudyRecordList
                onSelectDate={study.onSelectDate}
                rows={rows}
                selectedDateKey={study.selectedDateKey}
              />
            </>
          )}
        </section>
      </div>

      <div className="member-study__aside">
        <section
          aria-labelledby="member-study-detail-title"
          className="member-study__card"
        >
          <header className="member-study__card-header">
            <h3 id="member-study-detail-title">교시별 인정 시간</h3>
          </header>

          {report.loading ? (
            <StudySectionLoading label="상세 내역을 불러오는 중이에요." />
          ) : report.errorMessage !== null ? (
            <StudySectionError
              message={report.errorMessage}
              onRetry={report.onRetry}
            />
          ) : (
            <StudyDayDetail row={study.selectedRow} />
          )}
        </section>

        <section
          aria-labelledby="member-study-rule-title"
          className="member-study__card member-study__rule"
        >
          <header className="member-study__card-header">
            <h3 id="member-study-rule-title">시간 표기 규칙</h3>
          </header>
          <p>
            정규 공부는 교시 시간에 입실해 있는 동안 자동으로 인정돼요. 휴식
            공부는 입실 상태에서 <b>휴식시간 공부 시작</b>을 직접 눌러 진행한
            구간만 인정되고, 그냥 머물러 있는 시간은 포함되지 않아요. 휴가로
            제외된 교시는 계산에서 빠지며, 모든 날짜와 시각은 서울(Asia/Seoul)
            기준이에요.
          </p>
        </section>
      </div>
    </div>
  );
}

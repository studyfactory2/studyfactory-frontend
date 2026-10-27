import { useSession, type SessionOwnerKey } from '../../../core/session';
import { SectionError, SectionLoading } from '../../../shared/ui';
import { StudyDateSelector } from './components/StudyDateSelector';
import { StudyDayDetail } from './components/StudyDayDetail';
import { StudyHero } from './components/StudyHero';
import { StudyRangeTabs } from './components/StudyRangeTabs';
import { StudySummary } from './components/StudySummary';
import { useMemberStudy } from './hooks/useMemberStudy';
import {
  formatDateRange,
  formatTimeOfDayFromEpochMs,
} from './model/study.dates';
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
  const reportReady = !report.loading && report.errorMessage === null;
  const reportEpoch = report.asOf === null ? NaN : Date.parse(report.asOf);
  const reportTime =
    reportReady && Number.isFinite(reportEpoch)
      ? formatTimeOfDayFromEpochMs(reportEpoch)
      : null;

  const retryRecords = () => {
    report.onRetry();
    presenceHistory.onRetry();
  };

  return (
    <div className="member-study">
      <header className="member-study__header">
        <div className="member-study__heading">
          <h1>학습 기록</h1>
          <span>서울 기준</span>
        </div>
        <StudyRangeTabs onSelect={study.onSetRange} value={study.range} />
        <div className="member-study__range">
          <span>{formatDateRange(dateRange.from, dateRange.to)}</span>
          {reportTime && <span>{reportTime} 기준</span>}
        </div>
      </header>

      <div className="member-study__primary">
        <StudyHero
          breakSeconds={study.summary.breakSeconds}
          errorMessage={report.errorMessage}
          isLive={
            study.isLive &&
            !presenceHistory.loading &&
            presenceHistory.errorMessage === null
          }
          loading={report.loading}
          onRetry={report.onRetry}
          periodSeconds={study.summary.periodSeconds}
          rangeLabel={getRangeLabel(study.range)}
          totalSeconds={study.summary.totalSeconds}
        />

        {reportReady && study.range !== 'today' && (
          <StudySummary
            attendedDayCount={study.summary.attendedDayCount}
            averageSecondsPerAttendedDay={
              study.summary.averageSecondsPerAttendedDay
            }
          />
        )}
        {reportReady && study.summary.totalSeconds === 0 && (
          <p className="member-study__empty-note">
            아직 인정된 학습 시간이 없어요.
          </p>
        )}
      </div>

      <section aria-label="날짜별 학습 기록" className="member-study__card">
        {recordsLoading ? (
          <SectionLoading label="학습 기록을 불러오는 중이에요." />
        ) : recordsError !== null ? (
          <SectionError message={recordsError} onRetry={retryRecords} />
        ) : (
          <>
            {study.range !== 'today' && (
              <StudyDateSelector
                maxDaySeconds={study.summary.maxDaySeconds}
                onSelectDate={study.onSelectDate}
                range={study.range}
                rows={rows}
                selectedDateKey={study.selectedDateKey}
              />
            )}
            <div
              className={
                study.range === 'today'
                  ? undefined
                  : 'member-study__selected-detail'
              }
            >
              <StudyDayDetail
                key={study.selectedDateKey}
                row={study.selectedRow}
                showTotal={study.range !== 'today'}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

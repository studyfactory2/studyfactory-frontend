import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../shared/ui';
import { cx } from '../../../shared/lib/cx';
import { formatMemberLabel, type DrinkCount } from '../model/manager-beverages';

type BeverageMakingBoardProps = {
  cup: DrinkCount[];
  cupToMake: number;
  errorMessage: string | null;
  loading: boolean;
  onOpenEditor: (memberId: number) => void;
  onRetry: () => void;
  ready: boolean;
  tumbler: DrinkCount[];
  tumblerToMake: number;
};

export function BeverageMakingBoard({
  cup,
  cupToMake,
  errorMessage,
  loading,
  onOpenEditor,
  onRetry,
  ready,
  tumbler,
  tumblerToMake,
}: BeverageMakingBoardProps) {
  const cupGroups = cup.filter((group) => group.toMake > 0);
  const tumblerGroups = tumbler.filter((group) => group.toMake > 0);

  if (loading) {
    return (
      <Card className="staff-bev__card staff-bev__making-card" padding="sm">
        <CardHeader title="제조 목록" />
        <SectionLoading label="오늘 만들 음료를 계산하는 중" />
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="staff-bev__card staff-bev__making-card" padding="sm">
        <CardHeader title="제조 목록" />
        <SectionError message={errorMessage} onRetry={onRetry} />
      </Card>
    );
  }

  if (ready && cupToMake === 0 && tumblerToMake === 0) {
    return (
      <Card className="staff-bev__card staff-bev__making-card" padding="sm">
        <CardHeader title="제조 목록" />
        <SectionEmpty title="오늘 만들 음료가 없어요." />
      </Card>
    );
  }

  return (
    <Card className="staff-bev__card staff-bev__making-card" padding="sm">
      <CardHeader
        aside={
          <span className="staff-bev__section-total is-all">
            <b>{cupToMake + tumblerToMake}</b>잔
          </span>
        }
        title="제조 목록"
      />
      <div className="staff-bev__making">
        {cupToMake > 0 && (
          <MakingSection
            groups={cupGroups}
            onOpenEditor={onOpenEditor}
            title="컵"
            toMake={cupToMake}
            tone="cup"
          />
        )}
        {tumblerToMake > 0 && (
          <MakingSection
            groups={tumblerGroups}
            note="가져온 텀블러에 담습니다."
            onOpenEditor={onOpenEditor}
            title="텀블러"
            toMake={tumblerToMake}
            tone="tumbler"
          />
        )}
      </div>
    </Card>
  );
}

function MakingSection({
  groups,
  note,
  onOpenEditor,
  title,
  toMake,
  tone,
}: {
  groups: DrinkCount[];
  note?: string;
  onOpenEditor: (memberId: number) => void;
  title: string;
  toMake: number;
  tone: 'cup' | 'tumbler';
}) {
  return (
    <section className={cx('staff-bev__making-section', `is-${tone}`)}>
      <header className="staff-bev__making-head">
        <h4>{title}</h4>
        <span className="staff-bev__section-total">
          <b>{toMake}</b>잔
        </span>
      </header>
      {note && <p className="staff-bev__section-note">{note}</p>}

      <ul className="staff-bev__drinks">
        {groups.map((group) => (
          <DrinkRow
            group={group}
            key={group.name}
            onOpenEditor={onOpenEditor}
          />
        ))}
      </ul>
    </section>
  );
}

function DrinkRow({
  group,
  onOpenEditor,
}: {
  group: DrinkCount;
  onOpenEditor: (memberId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const servingsId = useId();
  const noteCount = group.servings.filter(
    (serving) => serving.note && !serving.deducted,
  ).length;
  const summary = (
    <>
      <span className="staff-bev__drink-name">{group.name}</span>
      <span className="staff-bev__drink-count">
        <b>{group.toMake}</b>
        {/* The deduction explains why the count differs from the roster. */}
        {group.deduction > 0 && (
          <em title={`휴무 ${group.deduction}명 제외`}>−{group.deduction}</em>
        )}
      </span>
    </>
  );

  return (
    <li className={cx('staff-bev__drink', expanded && 'is-expanded')}>
      <div className="staff-bev__drink-head">{summary}</div>
      <button
        aria-controls={servingsId}
        aria-expanded={expanded}
        aria-label={`${group.name} ${group.toMake}잔${
          group.deduction > 0 ? `, 휴무 ${group.deduction}명 제외` : ''
        }${noteCount > 0 ? `, 메모 ${noteCount}개` : ''}, 명단 ${
          expanded ? '접기' : '보기'
        }`}
        className="staff-bev__drink-toggle"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="staff-bev__drink-head">{summary}</span>
        <span className="staff-bev__drink-toggle-meta">
          {noteCount > 0 && (
            <span className="staff-bev__drink-note-count">
              메모 {noteCount}개
            </span>
          )}
          <span className="staff-bev__drink-toggle-action">
            명단 {expanded ? '접기' : '보기'}
            <ChevronDown aria-hidden="true" size={14} />
          </span>
        </span>
      </button>

      <ul className="staff-bev__seats" id={servingsId}>
        {group.servings.map((serving, index) => (
          <li
            className={cx(
              'staff-bev__seat-item',
              serving.note && !serving.deducted && 'has-note',
            )}
            key={`${serving.memberId}-${index}`}
          >
            <button
              aria-label={`${formatMemberLabel(
                serving.seatNumber,
                serving.memberName,
              )}, ${
                serving.deducted
                  ? `휴무로 ${group.name} 제조 제외`
                  : `${group.name}${serving.note ? `, 메모 ${serving.note}` : ''}`
              }, 음료 편집`}
              className={cx(
                'staff-bev__seat',
                serving.deducted && 'is-away',
                serving.note && !serving.deducted && 'has-note',
              )}
              onClick={() => onOpenEditor(serving.memberId)}
              type="button"
            >
              <span className="staff-bev__seat-who">
                {formatMemberLabel(serving.seatNumber, serving.memberName)}
              </span>
              {serving.deducted ? (
                <span className="staff-bev__seat-away">휴무</span>
              ) : (
                serving.note && (
                  <span className="staff-bev__seat-note">{serving.note}</span>
                )
              )}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

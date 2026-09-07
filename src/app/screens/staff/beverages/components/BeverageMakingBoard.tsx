import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import { formatMemberLabel, type DrinkCount } from '../model/staff-beverages';

type BeverageMakingBoardProps = {
  cup: DrinkCount[];
  cupToMake: number;
  errorMessage: string | null;
  loading: boolean;
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
  onRetry,
  ready,
  tumbler,
  tumblerToMake,
}: BeverageMakingBoardProps) {
  if (loading) {
    return (
      <Card className="staff-bev__card">
        <CardHeader title="제조 목록" />
        <SectionLoading label="오늘 만들 음료를 계산하는 중" />
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="staff-bev__card">
        <CardHeader title="제조 목록" />
        <SectionError message={errorMessage} onRetry={onRetry} />
      </Card>
    );
  }

  if (ready && cup.length === 0 && tumbler.length === 0) {
    return (
      <Card className="staff-bev__card">
        <CardHeader title="제조 목록" />
        <SectionEmpty title="오늘 만들 음료가 없어요." />
      </Card>
    );
  }

  return (
    <div className="staff-bev__making">
      <MakingSection
        emptyLabel="컵 음료 없음"
        groups={cup}
        title="컵"
        toMake={cupToMake}
      />
      <MakingSection
        emptyLabel="텀블러 음료 없음"
        groups={tumbler}
        note="회원이 가져온 텀블러에 담습니다."
        title="텀블러"
        toMake={tumblerToMake}
      />
    </div>
  );
}

function MakingSection({
  emptyLabel,
  groups,
  note,
  title,
  toMake,
}: {
  emptyLabel: string;
  groups: DrinkCount[];
  note?: string;
  title: string;
  toMake: number;
}) {
  return (
    <Card className="staff-bev__card">
      <CardHeader
        aside={
          <span className="staff-bev__section-total">
            <b>{toMake}</b>잔
          </span>
        }
        title={title}
      />
      {note && <p className="staff-bev__section-note">{note}</p>}

      {groups.length === 0 ? (
        <SectionEmpty title={emptyLabel} />
      ) : (
        <ul className="staff-bev__drinks">
          {groups.map((group) => (
            <DrinkRow group={group} key={group.name} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DrinkRow({ group }: { group: DrinkCount }) {
  return (
    <li className="staff-bev__drink">
      <div className="staff-bev__drink-head">
        <span className="staff-bev__drink-name">{group.name}</span>
        <span className="staff-bev__drink-count">
          <b>{group.toMake}</b>
          {/*
            The deduction is shown rather than folded away: someone counting
            cups against the member list needs to see why the two differ.
          */}
          {group.deduction > 0 && (
            <em title={`휴무 ${group.deduction}명 제외`}>−{group.deduction}</em>
          )}
        </span>
      </div>

      <ul className="staff-bev__seats">
        {group.servings.map((serving, index) => (
          <li
            className={cx('staff-bev__seat', serving.deducted && 'is-away')}
            key={`${serving.memberId}-${index}`}
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
          </li>
        ))}
      </ul>
    </li>
  );
}

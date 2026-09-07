import { cx } from '../../../../shared/lib/cx';
import '../styles/HomeDayTimeline.css';

export type HomeDayBlock = {
  availableSeconds: number;
  excludedByLeave: boolean;
  hasPlan: boolean;
  isBreak: boolean;
  label: string;
  ratio: number;
  recognizedSeconds: number;
  time: string;
};

/**
 * The day as it stands: nine blocks, each filled by the share of its minutes
 * the member actually earned. Blocks are sized by their real length, so 1교시
 * at 90 minutes is visibly wider than 3교시 at 70 — the strip is a picture of
 * the timetable, not nine equal boxes.
 *
 * A block excluded by leave is drawn hollow rather than empty: nothing was
 * earned, but nothing was missed either, and those two states must not look
 * the same.
 */
export function HomeDayTimeline({
  blocks,
}: {
  blocks: readonly HomeDayBlock[];
}) {
  const earned = blocks.filter((block) => block.ratio > 0).length;

  return (
    <figure className="member-home__timeline">
      <figcaption>
        오늘 교시별 인정 현황 · {blocks.length}개 구간 중 {earned}개 진행
      </figcaption>
      <div aria-hidden="true" className="member-home__timeline-track">
        {blocks.map((block) => (
          <span
            className={cx(
              'member-home__timeline-block',
              block.isBreak && 'is-break',
              block.excludedByLeave && 'is-excluded',
              block.hasPlan && 'has-plan',
            )}
            key={block.label}
            style={{ flexGrow: block.availableSeconds }}
            title={`${block.label} ${block.time}`}
          >
            <span
              className="member-home__timeline-fill"
              style={{ height: `${Math.round(block.ratio * 100)}%` }}
            />
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="member-home__timeline-axis">
        {blocks.map((block) => (
          <span
            className={cx(block.isBreak && 'is-break')}
            key={block.label}
            style={{ flexGrow: block.availableSeconds }}
          >
            {block.isBreak ? '·' : block.label.replace('교시', '')}
          </span>
        ))}
      </div>
    </figure>
  );
}

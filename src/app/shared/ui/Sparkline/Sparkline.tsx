import { cx } from '../../lib/cx';
import './sparkline.css';

export type SparklineProps = {
  values: readonly number[];
  /** Accessible summary of what the trend shows. */
  caption: string;
  className?: string;
};

/**
 * A trend, not a chart: no axis, no ticks, last point emphasised. Scaled to
 * the series peak like BarSeries, so the two read consistently side by side.
 */
export function Sparkline({ caption, className, values }: SparklineProps) {
  const peak = Math.max(...values, 0);

  return (
    <figure className={cx('ui-spark', className)}>
      <figcaption className="ui-spark__caption">{caption}</figcaption>
      <div aria-hidden="true" className="ui-spark__plot">
        {values.map((value, index) => (
          <span
            className="ui-spark__bar"
            key={index}
            style={{
              height: peak > 0 ? `max(2px, ${(value / peak) * 100}%)` : '2px',
            }}
          />
        ))}
      </div>
    </figure>
  );
}

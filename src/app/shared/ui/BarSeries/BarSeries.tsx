import { cx } from '../../lib/cx';
import './bar-series.css';

export type BarSeriesPoint = {
  /** Axis label under the bar. */
  label: string;
  value: number;
  /** Draws this bar in the accent colour — used for today. */
  emphasis?: boolean;
};

export type BarSeriesProps = {
  points: readonly BarSeriesPoint[];
  /** Accessible summary; the bars themselves are decorative once this is set. */
  caption: string;
  className?: string;
  height?: number;
};

/**
 * Bars are drawn against the largest value in the series, so the tallest bar
 * always fills the box. A zero value still draws a 2px stub, otherwise a day
 * with no study looks like a rendering fault rather than a real zero.
 */
export function BarSeries({
  caption,
  className,
  height = 34,
  points,
}: BarSeriesProps) {
  const peak = Math.max(...points.map((p) => p.value), 0);

  return (
    <figure className={cx('ui-bars', className)}>
      <figcaption className="ui-bars__caption">{caption}</figcaption>
      <div aria-hidden="true" className="ui-bars__plot" style={{ height }}>
        {points.map((point) => (
          <span
            className={cx('ui-bars__bar', point.emphasis && 'is-emphasis')}
            key={point.label}
            style={{
              height:
                peak > 0 ? `max(2px, ${(point.value / peak) * 100}%)` : '2px',
            }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="ui-bars__axis">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </figure>
  );
}

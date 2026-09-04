import './dial.css';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type DialProps = {
  /** 0–1. Values outside the range are clamped rather than drawn wrong. */
  value: number;
  /** What the ring means, for screen readers. */
  label: string;
  /** Text drawn in the middle. Defaults to the rounded percentage. */
  caption?: string;
  size?: number;
};

export function Dial({ caption, label, size = 96, value }: DialProps) {
  const ratio = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      aria-label={`${label} ${percent}%`}
      className="ui-dial"
      role="img"
      style={{ height: size, width: size }}
    >
      <svg aria-hidden="true" viewBox="0 0 96 96">
        <circle className="ui-dial__track" cx="48" cy="48" r={RADIUS} />
        <circle
          className="ui-dial__value"
          cx="48"
          cy="48"
          r={RADIUS}
          strokeDasharray={`${(ratio * CIRCUMFERENCE).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
        />
      </svg>
      <span className="ui-dial__caption">{caption ?? `${percent}%`}</span>
    </div>
  );
}

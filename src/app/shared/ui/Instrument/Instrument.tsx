import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import './instrument.css';

export type InstrumentProps = {
  children: ReactNode;
  className?: string;
  /** Small right-aligned figure in the header, e.g. a goal or a comparison. */
  note?: ReactNode;
  label: string;
};

/**
 * A dark surface for data. See instrument.css for why this needs no dark
 * variants of the components placed inside it.
 */
export function Instrument({
  children,
  className,
  label,
  note,
}: InstrumentProps) {
  return (
    <section aria-label={label} className={cx('instrument', className)}>
      <header className="instrument__head">
        <h3 className="instrument__label">{label}</h3>
        {note !== undefined && <p className="instrument__note">{note}</p>}
      </header>
      {children}
    </section>
  );
}

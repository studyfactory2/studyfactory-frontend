import type { ReactNode, TableHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import './table.css';

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

export function Table({ children, className, ...rest }: TableProps) {
  return (
    <div className="table-wrap">
      <table className={cx('table', className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

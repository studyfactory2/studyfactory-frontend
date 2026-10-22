import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ScreenHeaderControlContext } from './screen-toolbar-context';

/** A screen-owned mobile control, without moving its state into the shell. */
export function AppShellHeaderControl({ children }: { children: ReactNode }) {
  const target = useContext(ScreenHeaderControlContext);

  if (target === undefined) return children;

  return target === null ? null : createPortal(children, target);
}

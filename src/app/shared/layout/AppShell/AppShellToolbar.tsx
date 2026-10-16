import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ScreenToolbarContext } from './screen-toolbar-context';

/** Keep screen-owned state and handlers while displaying controls in the shell. */
export function AppShellToolbar({ children }: { children: ReactNode }) {
  const target = useContext(ScreenToolbarContext);

  if (target === undefined) return children;

  return target === null ? null : createPortal(children, target);
}

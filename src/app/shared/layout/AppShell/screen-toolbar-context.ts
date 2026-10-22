import { createContext } from 'react';

// Undefined means there is no shell toolbar (for example, a standalone view).
// Null means the shell is mounting its target; wait rather than render twice.
export const ScreenToolbarContext = createContext<
  HTMLElement | null | undefined
>(undefined);

export const ScreenHeaderControlContext = createContext<
  HTMLElement | null | undefined
>(undefined);

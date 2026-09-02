import { createContext } from 'react';
import type { Session } from './types';

export const SessionContext = createContext<Session | null>(null);

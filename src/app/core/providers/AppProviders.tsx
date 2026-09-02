import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/ui';
import { SessionProvider } from '../session';
import { queryClient } from './query-client';
import { SessionQueryBoundary } from './SessionQueryBoundary';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SessionQueryBoundary>
          <BrowserRouter>
            <ToastProvider>{children}</ToastProvider>
          </BrowserRouter>
        </SessionQueryBoundary>
      </SessionProvider>
    </QueryClientProvider>
  );
}

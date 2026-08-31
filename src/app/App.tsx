import { ToastProvider } from './components/ui';
import { AppRouter } from './routes/AppRouter';

export function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

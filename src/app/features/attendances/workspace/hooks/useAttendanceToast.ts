import { useCallback } from 'react';
import { useToast } from '../../../../shared/ui';
import type { ToastTone } from '../../../../shared/ui/Toast/toast-context';

export function useAttendanceToast() {
  const { toast } = useToast();
  const attendanceToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      toast(
        message,
        tone,
        tone === 'success'
          ? {
              durationMs: 1500,
              anchorSelector: '[data-toast-anchor="attendance"]',
            }
          : undefined,
      );
    },
    [toast],
  );

  return { toast: attendanceToast };
}

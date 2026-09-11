import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionOwnerKey } from '../../../../core/session';
import { memberQueryKeys } from '../../../../features/members/member-query-keys';
import { fetchBranchMembers } from '../../../../features/members/members-api';
import { staffScheduleQueryKeys } from '../../../../features/staff-schedules/staff-schedule-query-keys';
import {
  fetchStaffSchedules,
  updateStaffSchedules,
  type StaffScheduleUpdateRequest,
} from '../../../../features/staff-schedules/staff-schedules-api';
import { useToast } from '../../../../shared/ui';
import {
  buildAdminStaffScheduleRequest,
  countAdminStaffScheduleAssignments,
  createAdminStaffScheduleDraft,
  createAdminStaffScheduleSignature,
  createBlankAdminStaffScheduleDraft,
  type AdminStaffScheduleDraft,
} from '../model/admin-staff-schedule';

const SCHEDULE_STALE_TIME_MS = 30 * 60 * 1_000;
const ROSTER_STALE_TIME_MS = 5 * 60 * 1_000;

type EditorState = {
  baselineSignature: string;
  conflictDraft: AdminStaffScheduleDraft | null;
  draft: AdminStaffScheduleDraft;
};

type UseAdminStaffScheduleArgs = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

export function useAdminStaffSchedule({
  branchId,
  memberId,
  ownerKey,
}: UseAdminStaffScheduleArgs) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = staffScheduleQueryKeys.board(ownerKey, branchId);
  const scheduleQuery = useQuery({
    queryFn: () => fetchStaffSchedules(branchId, memberId),
    queryKey,
    staleTime: SCHEDULE_STALE_TIME_MS,
  });
  const rosterQuery = useQuery({
    queryFn: () => fetchBranchMembers(branchId, memberId),
    queryKey: memberQueryKeys.branch(ownerKey, branchId),
    staleTime: ROSTER_STALE_TIME_MS,
  });
  const updateMutation = useMutation({
    mutationFn: (request: StaffScheduleUpdateRequest) =>
      updateStaffSchedules(branchId, request, memberId),
  });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const saveInFlightRef = useRef(false);
  const saving = savePending || updateMutation.isPending;
  const savedDraft = useMemo(
    () => createAdminStaffScheduleDraft(scheduleQuery.data ?? []),
    [scheduleQuery.data],
  );
  const dirty =
    editor !== null &&
    createAdminStaffScheduleSignature(editor.draft) !==
      editor.baselineSignature;

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const openEditor = () => {
    if (scheduleQuery.data === undefined) {
      return;
    }

    setEditor({
      baselineSignature: createAdminStaffScheduleSignature(savedDraft),
      conflictDraft: null,
      draft: { ...savedDraft },
    });
    setEditorError(null);
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setEditor(null);
    setEditorError(null);
  };

  const changeWorkerName = (key: string, workerName: string) => {
    setEditor((current) =>
      current === null
        ? null
        : {
            ...current,
            conflictDraft: null,
            draft: { ...current.draft, [key]: workerName.slice(0, 50) },
          },
    );
    setEditorError(null);
  };

  const clearDraft = () => {
    setEditor((current) =>
      current === null
        ? null
        : {
            ...current,
            conflictDraft: null,
            draft: createBlankAdminStaffScheduleDraft(),
          },
    );
    setEditorError(null);
  };

  const adoptLatestDraft = () => {
    setEditor((current) => {
      if (current?.conflictDraft === null || current === null) {
        return current;
      }

      return {
        baselineSignature: createAdminStaffScheduleSignature(
          current.conflictDraft,
        ),
        conflictDraft: null,
        draft: { ...current.conflictDraft },
      };
    });
    setEditorError(null);
    toast('최신 근무표를 불러왔어요.', 'info');
  };

  const saveEditor = async () => {
    if (editor === null || !dirty || saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setSavePending(true);
    setEditorError(null);

    try {
      /* Best-effort stale check; atomic conflict protection needs backend versioning. */
      const latest = await fetchStaffSchedules(branchId, memberId);
      const latestDraft = createAdminStaffScheduleDraft(latest);
      const latestSignature = createAdminStaffScheduleSignature(latestDraft);

      queryClient.setQueryData(queryKey, latest);

      if (latestSignature !== editor.baselineSignature) {
        setEditor((current) =>
          current === null ? null : { ...current, conflictDraft: latestDraft },
        );
        setEditorError(
          '다른 관리자가 근무표를 먼저 변경했어요. 최신 내용을 불러온 뒤 다시 수정해 주세요.',
        );
        return;
      }

      const updated = await updateMutation.mutateAsync({
        schedules: buildAdminStaffScheduleRequest(editor.draft),
      });

      queryClient.setQueryData(queryKey, updated);
      setEditor(null);
      toast('주간 근무표를 저장했어요.', 'success');
    } catch (error) {
      setEditorError(
        error instanceof Error && error.message !== ''
          ? error.message
          : '근무표를 저장하지 못했어요.',
      );
    } finally {
      saveInFlightRef.current = false;
      setSavePending(false);
    }
  };

  const refreshSchedule = async () => {
    const result = await scheduleQuery.refetch();

    if (result.isError) {
      toast(result.error.message || '근무표를 새로고침하지 못했어요.', 'error');
    }
  };

  const suggestions = useMemo(() => {
    const names = new Set(
      (rosterQuery.data ?? [])
        .filter((member) => member.role === 'ADMIN' || member.role === 'STAFF')
        .map((member) => member.name.trim())
        .filter(Boolean),
    );

    Object.values(savedDraft)
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => names.add(name));

    return [...names].sort((left, right) => left.localeCompare(right, 'ko'));
  }, [rosterQuery.data, savedDraft]);

  return {
    editor: {
      assignedCount:
        editor === null ? 0 : countAdminStaffScheduleAssignments(editor.draft),
      conflict: editor !== null && editor.conflictDraft !== null,
      dirty,
      draft: editor?.draft ?? createBlankAdminStaffScheduleDraft(),
      errorMessage: editorError,
      onChange: changeWorkerName,
      onClear: clearDraft,
      onClose: closeEditor,
      onReloadLatest: adoptLatestDraft,
      onSave: () => void saveEditor(),
      open: editor !== null,
      savedAssignedCount: countAdminStaffScheduleAssignments(savedDraft),
      saving,
      suggestions,
    },
    request: {
      errorMessage:
        scheduleQuery.isError && scheduleQuery.data === undefined
          ? scheduleQuery.error.message
          : null,
      loading: scheduleQuery.isPending,
      onEdit: openEditor,
      onRefresh: () => void refreshSchedule(),
      onRetry: () => void refreshSchedule(),
      ready: scheduleQuery.data !== undefined,
      refreshing: scheduleQuery.isFetching && scheduleQuery.data !== undefined,
    },
    schedule: {
      assignedCount: countAdminStaffScheduleAssignments(savedDraft),
      draft: savedDraft,
    },
  };
}

export type AdminStaffScheduleState = ReturnType<typeof useAdminStaffSchedule>;

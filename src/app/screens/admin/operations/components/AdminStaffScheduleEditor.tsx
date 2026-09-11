import { useId, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Modal } from '../../../../shared/ui';
import type { AdminStaffScheduleState } from '../hooks/useAdminStaffSchedule';
import { AdminStaffScheduleEditorGrid } from './AdminStaffScheduleEditorGrid';

export function AdminStaffScheduleEditor({
  branchName,
  editor,
}: {
  branchName: string;
  editor: AdminStaffScheduleState['editor'];
}) {
  const suggestionsId = useId();
  const [confirmingBlank, setConfirmingBlank] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const changeWorkerName = (key: string, value: string) => {
    setConfirmingBlank(false);
    setConfirmingDiscard(false);
    editor.onChange(key, value);
  };

  const requestClose = () => {
    if (editor.dirty) {
      setConfirmingDiscard(true);
      setConfirmingBlank(false);
      return;
    }

    editor.onClose();
  };

  const requestSave = () => {
    if (
      editor.assignedCount === 0 &&
      editor.savedAssignedCount > 0 &&
      !confirmingBlank
    ) {
      setConfirmingBlank(true);
      setConfirmingDiscard(false);
      return;
    }

    editor.onSave();
  };

  return (
    <Modal
      closeDisabled={editor.saving}
      footer={
        <EditorFooter
          confirmingBlank={confirmingBlank}
          confirmingDiscard={confirmingDiscard}
          editor={editor}
          onContinue={() => setConfirmingDiscard(false)}
          onRequestClose={requestClose}
          onRequestSave={requestSave}
        />
      }
      onClose={requestClose}
      open
      panelClassName="admin-schedule-editor-modal"
      size="lg"
      title={`${branchName} 주간 근무표`}
    >
      <div className="admin-schedule-editor">
        <div className="admin-schedule-editor__intro">
          <div>
            <strong>매주 반복되는 담당자를 입력해 주세요.</strong>
            <p>
              비워 둔 칸은 미배정으로 저장되며, 이름은 직접 입력할 수 있어요.
            </p>
          </div>
          <button
            disabled={editor.assignedCount === 0 || editor.saving}
            onClick={() => {
              setConfirmingBlank(false);
              setConfirmingDiscard(false);
              editor.onClear();
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={14} />
            전체 비우기
          </button>
        </div>

        <EditorMessages
          confirmingBlank={confirmingBlank}
          confirmingDiscard={confirmingDiscard}
          editor={editor}
        />

        <datalist id={suggestionsId}>
          {editor.suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <AdminStaffScheduleEditorGrid
          disabled={editor.saving}
          draft={editor.draft}
          onChange={changeWorkerName}
          suggestionsId={suggestionsId}
        />

        <p className="admin-schedule-editor__status" aria-live="polite">
          배정 {editor.assignedCount}/28칸
          {editor.dirty
            ? ' · 저장하지 않은 변경 있음'
            : ' · 저장된 내용과 같음'}
        </p>
      </div>
    </Modal>
  );
}

function EditorFooter({
  confirmingBlank,
  confirmingDiscard,
  editor,
  onContinue,
  onRequestClose,
  onRequestSave,
}: {
  confirmingBlank: boolean;
  confirmingDiscard: boolean;
  editor: AdminStaffScheduleState['editor'];
  onContinue: () => void;
  onRequestClose: () => void;
  onRequestSave: () => void;
}) {
  if (confirmingDiscard) {
    return (
      <>
        <Button disabled={editor.saving} onClick={onContinue} variant="subtle">
          계속 수정
        </Button>
        <Button
          disabled={editor.saving}
          onClick={editor.onClose}
          variant="danger"
        >
          변경 취소
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        disabled={editor.saving}
        onClick={onRequestClose}
        variant="subtle"
      >
        취소
      </Button>
      <Button
        disabled={!editor.dirty || editor.conflict}
        loading={editor.saving}
        onClick={onRequestSave}
      >
        {confirmingBlank ? '빈 근무표 저장' : '저장'}
      </Button>
    </>
  );
}

function EditorMessages({
  confirmingBlank,
  confirmingDiscard,
  editor,
}: {
  confirmingBlank: boolean;
  confirmingDiscard: boolean;
  editor: AdminStaffScheduleState['editor'];
}) {
  return (
    <>
      {confirmingBlank && (
        <div className="admin-schedule-editor__warning" role="alert">
          <AlertTriangle aria-hidden="true" size={17} />
          <span>
            모든 배정을 비운 상태예요. 아래의 <strong>빈 근무표 저장</strong>을
            한 번 더 누르면 전체가 미배정으로 저장돼요.
          </span>
        </div>
      )}

      {confirmingDiscard && (
        <div className="admin-schedule-editor__warning" role="alert">
          <AlertTriangle aria-hidden="true" size={17} />
          <span>
            저장하지 않은 변경이 있어요. 아래에서 계속 수정하거나 변경을 취소해
            주세요.
          </span>
        </div>
      )}

      {editor.errorMessage !== null && (
        <div className="admin-schedule-editor__error" role="alert">
          <span>{editor.errorMessage}</span>
          {editor.conflict && (
            <button onClick={editor.onReloadLatest} type="button">
              최신 내용 불러오기
            </button>
          )}
        </div>
      )}
    </>
  );
}

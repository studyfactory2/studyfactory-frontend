import { useState } from 'react';
import {
  Button,
  Field,
  Input,
  Modal,
  Textarea,
} from '../../../../../shared/ui';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
  type BeverageEditorTarget,
} from '../model/beverage.types';
import '../styles/BeverageEditorModal.css';

export type BeverageEditorModalProps = {
  onClose: () => void;
  onDelete: (index: number) => void;
  onSubmit: (name: string, note: string) => void;
  saving: boolean;
  target: BeverageEditorTarget | null;
};

export function BeverageEditorModal({
  onClose,
  onDelete,
  onSubmit,
  saving,
  target,
}: BeverageEditorModalProps) {
  return (
    <Modal
      onClose={onClose}
      open={target !== null}
      size="sm"
      title={target?.kind === 'edit' ? '음료 수정' : '음료 추가'}
    >
      {target !== null && (
        <BeverageEditorBody
          key={target.kind === 'edit' ? `edit-${target.index}` : 'add'}
          onClose={onClose}
          onDelete={onDelete}
          onSubmit={onSubmit}
          saving={saving}
          target={target}
        />
      )}
    </Modal>
  );
}

function BeverageEditorBody({
  onClose,
  onDelete,
  onSubmit,
  saving,
  target,
}: {
  onClose: () => void;
  onDelete: (index: number) => void;
  onSubmit: (name: string, note: string) => void;
  saving: boolean;
  target: BeverageEditorTarget;
}) {
  const [name, setName] = useState(target.kind === 'edit' ? target.name : '');
  const [note, setNote] = useState(target.kind === 'edit' ? target.note : '');

  return (
    <form
      className="member-beverages__editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name, note);
      }}
    >
      <Field label="음료 이름" required>
        {(id) => (
          <Input
            id={id}
            maxLength={BEVERAGE_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 아이스 아메리카노"
            value={name}
          />
        )}
      </Field>

      <Field
        hint="얼음 양, 당도처럼 스텝이 알아야 할 내용을 적어 주세요."
        label="요청 사항"
      >
        {(id) => (
          <Textarea
            id={id}
            maxLength={BEVERAGE_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            placeholder="예: 얼음 적게, 시럽 빼고"
            rows={3}
            value={note}
          />
        )}
      </Field>

      <div className="member-beverages__editor-actions">
        {target.kind === 'edit' && (
          <Button
            className="member-beverages__editor-delete"
            loading={saving}
            onClick={() => onDelete(target.index)}
            variant="danger"
          >
            삭제
          </Button>
        )}
        <Button onClick={onClose} variant="ghost">
          닫기
        </Button>
        <Button
          disabled={name.trim().length === 0}
          loading={saving}
          type="submit"
        >
          저장
        </Button>
      </div>
    </form>
  );
}

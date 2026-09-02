import { Check, CirclePlus, ClipboardList, Trash2 } from 'lucide-react';
import { Button, Modal } from '../../../../shared/ui';
import type {
  EditablePlanItem,
  PlanCell,
  PlanItemUpdate,
  PlanRow,
} from '../model/plan.types';
import '../styles/PlanEditorModal.css';

export type PlanEditorModalProps = {
  cell: PlanCell | null;
  dateLabel: string;
  dayLabel: string;
  items: readonly EditablePlanItem[];
  onAdd: (cell: PlanCell) => void;
  onClose: () => void;
  onDelete: (draftId: string) => void;
  onUpdate: (draftId: string, update: PlanItemUpdate) => void;
  row: PlanRow | null;
};

export function PlanEditorModal({
  cell,
  dateLabel,
  dayLabel,
  items,
  onAdd,
  onClose,
  onDelete,
  onUpdate,
  row,
}: PlanEditorModalProps) {
  const open = cell !== null && row !== null;

  return (
    <Modal
      footer={
        <Button onClick={onClose} variant="ghost">
          편집 완료
        </Button>
      }
      onClose={onClose}
      open={open}
      title={open ? `${dayLabel} · ${row.label}` : '계획 편집'}
    >
      {cell && row && (
        <div className="member-plans__editor">
          <p className="member-plans__editor-time">
            {dateLabel}
            <span>·</span>
            {row.time} ({row.duration})
          </p>

          {items.length === 0 ? (
            <div className="member-plans__editor-empty">
              <ClipboardList aria-hidden="true" size={24} />
              <strong>아직 등록된 계획이 없어요.</strong>
              <span>이 시간에 끝내고 싶은 일을 추가해 보세요.</span>
            </div>
          ) : (
            <div className="member-plans__editor-list">
              {items.map((item, itemIndex) => (
                <div className="member-plans__editor-item" key={item.draftId}>
                  <label className="member-plans__editor-check">
                    <input
                      checked={item.done}
                      onChange={(event) =>
                        onUpdate(item.draftId, {
                          done: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <em className="member-plans__sr-only">
                      {itemIndex + 1}번째 계획 완료
                    </em>
                  </label>
                  <input
                    aria-label={`${itemIndex + 1}번째 계획 내용`}
                    className={item.done ? 'is-done' : ''}
                    onChange={(event) =>
                      onUpdate(item.draftId, {
                        content: event.target.value,
                      })
                    }
                    placeholder="예: 회계학 3장 문제풀이"
                    value={item.content}
                  />
                  <button
                    aria-label={`${itemIndex + 1}번째 계획 삭제`}
                    onClick={() => onDelete(item.draftId)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button full onClick={() => onAdd(cell)} variant="subtle">
            <CirclePlus aria-hidden="true" size={18} />
            계획 추가
          </Button>
          <p className="member-plans__editor-note">
            여기서 편집한 뒤 화면 아래의 <strong>주간 계획 저장</strong>을
            눌러야 최종 저장됩니다.
          </p>
        </div>
      )}
    </Modal>
  );
}

import type { TodoResponse } from '../../todos/todos-api';
import { Button, Modal } from '../../../shared/ui';

export function ManagerTodoDeleteDialog({
  onClose,
  onConfirm,
  openTodo,
  saving,
}: {
  onClose: () => void;
  onConfirm: (todo: TodoResponse) => void;
  openTodo: TodoResponse | null;
  saving: boolean;
}) {
  return (
    <Modal
      closeDisabled={saving}
      onClose={onClose}
      open={openTodo !== null}
      size="sm"
      title="할 일 삭제"
    >
      {openTodo && (
        <div className="manager-work__delete-dialog">
          <p>이 할 일을 삭제할까요?</p>
          <blockquote>{openTodo.content}</blockquote>
          <div>
            <Button disabled={saving} onClick={onClose} variant="ghost">
              취소
            </Button>
            <Button
              loading={saving}
              onClick={() => onConfirm(openTodo)}
              variant="danger"
            >
              삭제
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

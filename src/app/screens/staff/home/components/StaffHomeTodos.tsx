import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { staffRoutes } from '../../../../core/router/routes';
import {
  Card,
  CardHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import { cx } from '../../../../shared/lib/cx';

type StaffHomeTodosProps = {
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
  preview: TodoResponse[];
  remainingCount: number;
};

/** What a todo was raised by, when it was not typed in by hand. */
const SOURCE_LABELS: Record<TodoResponse['sourceType'], string | null> = {
  JOIN_MEMBER: '신규 회원',
  MANUAL: null,
  SUGGESTION: '건의에서',
};

export function StaffHomeTodos({
  errorMessage,
  loading,
  onRetry,
  preview,
  remainingCount,
}: StaffHomeTodosProps) {
  return (
    <Card className="staff-home__card">
      <CardHeader
        aside={
          <Link className="staff-home__card-link" to={staffRoutes.operations}>
            운영에서 전체 보기
          </Link>
        }
        title={
          remainingCount > 0 ? `남은 할 일 ${remainingCount}건` : '남은 할 일'
        }
      />

      {loading ? (
        <SectionLoading label="할 일을 불러오는 중" />
      ) : errorMessage ? (
        <SectionError message={errorMessage} onRetry={onRetry} />
      ) : preview.length === 0 ? (
        <SectionEmpty title="오늘 할 일을 모두 끝냈어요.">
          <p>새 할 일은 운영 화면에서 추가할 수 있어요.</p>
        </SectionEmpty>
      ) : (
        <ul className="staff-home__todos">
          {preview.map((todo) => {
            const source = SOURCE_LABELS[todo.sourceType];

            return (
              <li className="staff-home__todo" key={todo.id}>
                <span aria-hidden="true" className="staff-home__todo-box">
                  <Check size={13} />
                </span>
                <span className="staff-home__todo-text">{todo.content}</span>
                <span className="staff-home__todo-tags">
                  <span
                    className={cx(
                      'staff-home__tag',
                      todo.priority === 'URGENT' && 'is-urgent',
                    )}
                  >
                    {todo.priority === 'URGENT' ? '긴급' : '일반'}
                  </span>
                  {source && (
                    <span className="staff-home__tag is-source">{source}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

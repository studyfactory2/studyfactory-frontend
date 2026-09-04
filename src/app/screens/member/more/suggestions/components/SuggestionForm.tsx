import { Info } from 'lucide-react';
import type { SuggestionCategory } from '../../../../../features/suggestions/suggestions-api';
import { Button, Field, Textarea } from '../../../../../shared/ui';
import {
  RESOLVED_RETENTION_DAYS,
  SUGGESTION_CATEGORY_OPTIONS,
  SUGGESTION_CONTENT_MAX_LENGTH,
} from '../model/suggestion.types';
import '../styles/SuggestionForm.css';

export type SuggestionFormProps = {
  category: SuggestionCategory | null;
  content: string;
  onChangeContent: (content: string) => void;
  onSelectCategory: (category: SuggestionCategory) => void;
  onSubmit: () => void;
  submittable: boolean;
  submitting: boolean;
};

export function SuggestionForm({
  category,
  content,
  onChangeContent,
  onSelectCategory,
  onSubmit,
  submittable,
  submitting,
}: SuggestionFormProps) {
  return (
    <form
      className="member-suggestions__form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div
        aria-label="요청 종류"
        className="member-suggestions__categories"
        role="radiogroup"
      >
        {SUGGESTION_CATEGORY_OPTIONS.map((option) => {
          const Icon = option.icon;

          return (
            <button
              aria-checked={category === option.value}
              className={[
                'member-suggestions__category',
                category === option.value ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={option.value}
              onClick={() => onSelectCategory(option.value)}
              role="radio"
              type="button"
            >
              <span
                aria-hidden="true"
                className="member-suggestions__category-icon"
              >
                <Icon size={17} />
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          );
        })}
      </div>

      <Field label="요청 내용" required>
        {(id) => (
          <Textarea
            id={id}
            maxLength={SUGGESTION_CONTENT_MAX_LENGTH}
            onChange={(event) => onChangeContent(event.target.value)}
            placeholder="예: 3번 정수기에서 온수가 나오지 않아요."
            rows={5}
            value={content}
          />
        )}
      </Field>

      <div className="member-suggestions__form-footer">
        <span className="member-suggestions__counter">
          {content.length} / {SUGGESTION_CONTENT_MAX_LENGTH}
        </span>
        <Button disabled={!submittable} loading={submitting} type="submit">
          요청 보내기
        </Button>
      </div>

      <p className="member-suggestions__note">
        <Info aria-hidden="true" size={14} />
        <span>
          보낸 요청은 지점 데스크에서 확인해요. 처리 완료된 요청은{' '}
          {RESOLVED_RETENTION_DAYS}일 뒤 자동으로 정리됩니다.
        </span>
      </p>
    </form>
  );
}

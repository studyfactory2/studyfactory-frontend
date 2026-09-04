import type { SuggestionResponse } from '../../../../../features/suggestions/suggestions-api';
import { Badge } from '../../../../../shared/ui';
import { formatSuggestionDate } from '../model/suggestion.format';
import { getSuggestionCategoryLabel } from '../model/suggestion.types';
import '../styles/SuggestionList.css';

export function SuggestionList({
  rows,
}: {
  rows: readonly SuggestionResponse[];
}) {
  return (
    <ol className="member-suggestions__list">
      {rows.map((row) => (
        <li key={row.id}>
          <article className="member-suggestions__item">
            <header>
              <Badge tone="neutral">
                {getSuggestionCategoryLabel(row.category)}
              </Badge>
              {/* Design appendix: 완료 is 숲초록, 검토 중 is 뮤트 골드. */}
              <Badge tone={row.isResolved ? 'positive' : 'special'}>
                {row.isResolved ? '처리 완료' : '검토 중'}
              </Badge>
              <time dateTime={row.createdAt}>
                {formatSuggestionDate(row.createdAt)}
              </time>
            </header>
            <p>{row.content}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}

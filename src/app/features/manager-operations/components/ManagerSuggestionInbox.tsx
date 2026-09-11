import { useState } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { cx } from '../../../shared/lib/cx';
import {
  Badge,
  Button,
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../shared/ui';
import type { useManagerSuggestions } from '../hooks/useManagerSuggestions';
import {
  formatServerLocalDate,
  SUGGESTION_CATEGORY_LABELS,
} from '../model/manager-operations';

type SuggestionFilter = 'open' | 'resolved';

export function ManagerSuggestionInbox({
  suggestions,
}: {
  suggestions: ReturnType<typeof useManagerSuggestions>;
}) {
  const [filter, setFilter] = useState<SuggestionFilter>('open');
  const rows = filter === 'open' ? suggestions.open : suggestions.resolved;

  return (
    <Card
      className="manager-work__panel manager-work__suggestions"
      padding="none"
    >
      <header className="manager-work__panel-header">
        <span className="manager-work__panel-title">
          <i aria-hidden="true">
            <MessageCircle size={18} />
          </i>
          <span>
            <strong>회원 요청</strong>
            <small>미처리 {suggestions.open.length}건</small>
          </span>
        </span>
        <button
          aria-label="회원 요청 새로고침"
          className={cx(
            'manager-work__refresh',
            suggestions.refreshing && 'is-refreshing',
          )}
          disabled={suggestions.refreshing}
          onClick={suggestions.onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} />
        </button>
      </header>

      <div
        aria-label="회원 요청 상태"
        className="manager-work__suggestion-filter"
      >
        <button
          aria-pressed={filter === 'open'}
          className={cx(filter === 'open' && 'is-active')}
          id="manager-work-suggestion-filter-open"
          onClick={() => setFilter('open')}
          type="button"
        >
          미처리 <span>{suggestions.open.length}</span>
        </button>
        <button
          aria-pressed={filter === 'resolved'}
          className={cx(filter === 'resolved' && 'is-active')}
          id="manager-work-suggestion-filter-resolved"
          onClick={() => setFilter('resolved')}
          type="button"
        >
          완료 <span>{suggestions.resolved.length}</span>
        </button>
      </div>

      <div className="manager-work__panel-body">
        {suggestions.errorMessage && (
          <SectionError
            message={suggestions.errorMessage}
            onRetry={suggestions.onRetry}
          />
        )}

        {suggestions.loading ? (
          <SectionLoading label="회원 요청을 불러오는 중이에요." />
        ) : !suggestions.ready ? null : rows.length === 0 ? (
          <SectionEmpty
            title={
              filter === 'open'
                ? '처리할 회원 요청이 없어요'
                : '완료한 요청이 없어요'
            }
          >
            <p>
              {filter === 'open'
                ? '새 요청이 들어오면 이곳에 표시돼요.'
                : '처리한 요청은 이곳에서 다시 확인할 수 있어요.'}
            </p>
          </SectionEmpty>
        ) : (
          <ul className="manager-work__suggestion-list">
            {rows.map((suggestion) => {
              const resolving = suggestions.savingIds.has(suggestion.id);

              return (
                <li
                  className={cx(suggestion.isResolved && 'is-resolved')}
                  key={suggestion.id}
                >
                  <header>
                    <span>
                      <strong>
                        {suggestion.memberName ?? `회원 ${suggestion.memberId}`}
                      </strong>
                      <small>
                        {formatServerLocalDate(suggestion.createdAt)}
                      </small>
                    </span>
                    <Badge
                      tone={
                        suggestion.category === 'COUNSELING'
                          ? 'special'
                          : suggestion.category === 'SUPPLIES'
                            ? 'accent'
                            : 'neutral'
                      }
                    >
                      {SUGGESTION_CATEGORY_LABELS[suggestion.category]}
                    </Badge>
                  </header>

                  <p>{suggestion.content}</p>

                  {suggestion.isResolved && suggestion.resolvedByMemberName && (
                    <span className="manager-work__suggestion-resolver">
                      {suggestion.resolvedByMemberName} 처리
                    </span>
                  )}

                  <Button
                    full
                    id={`manager-work-suggestion-action-${suggestion.id}`}
                    loading={resolving}
                    onClick={() => {
                      const index = rows.findIndex(
                        (row) => row.id === suggestion.id,
                      );
                      const adjacent = rows[index + 1] ?? rows[index - 1];

                      suggestions.onToggle(suggestion, () => {
                        window.requestAnimationFrame(() => {
                          const sameControl = document.getElementById(
                            `manager-work-suggestion-action-${suggestion.id}`,
                          );
                          const adjacentControl = adjacent
                            ? document.getElementById(
                                `manager-work-suggestion-action-${adjacent.id}`,
                              )
                            : null;
                          const fallback = document.getElementById(
                            `manager-work-suggestion-filter-${filter}`,
                          );

                          (sameControl ?? adjacentControl ?? fallback)?.focus();
                        });
                      });
                    }}
                    size="sm"
                    variant={suggestion.isResolved ? 'ghost' : 'primary'}
                  >
                    {suggestion.isResolved ? (
                      <RotateCcw aria-hidden="true" size={14} />
                    ) : (
                      <CheckCircle2 aria-hidden="true" size={14} />
                    )}
                    {suggestion.isResolved ? '다시 열기' : '처리 완료'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

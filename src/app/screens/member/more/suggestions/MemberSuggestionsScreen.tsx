import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import { SuggestionForm } from './components/SuggestionForm';
import { SuggestionList } from './components/SuggestionList';
import {
  SuggestionSectionEmpty,
  SuggestionSectionError,
  SuggestionSectionLoading,
} from './components/SuggestionSectionState';
import { useMemberSuggestions } from './hooks/useMemberSuggestions';
import './styles/MemberSuggestionsScreen.css';

export function MemberSuggestionsScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberSuggestions
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberSuggestions({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const suggestions = useMemberSuggestions(memberId, queryOwnerKey);
  const { history } = suggestions;

  return (
    <section className="member-suggestions">
      <header className="member-suggestions__header">
        <Link className="member-suggestions__back" to={memberRoutes.more}>
          <ChevronLeft aria-hidden="true" size={16} />
          더보기
        </Link>
        <p className="member-suggestions__eyebrow">MEMBER · REQUEST</p>
        <h2 className="member-suggestions__title">요청</h2>
        <p className="member-suggestions__subtitle">
          필요한 것을 지점에 알리고 처리 상태를 확인해요.
        </p>
      </header>

      <div className="member-suggestions__card">
        <SuggestionForm
          category={suggestions.category}
          content={suggestions.content}
          onChangeContent={suggestions.onChangeContent}
          onSelectCategory={suggestions.onSelectCategory}
          onSubmit={suggestions.onSubmit}
          submittable={suggestions.submittable}
          submitting={suggestions.submitting}
        />
      </div>

      <section
        aria-labelledby="member-suggestions-history-title"
        className="member-suggestions__card"
      >
        <header className="member-suggestions__card-header">
          <h3 id="member-suggestions-history-title">보낸 요청</h3>
          {history.rows.length > 0 && <span>{history.rows.length}건</span>}
        </header>

        {history.loading ? (
          <SuggestionSectionLoading label="요청 내역을 불러오는 중이에요." />
        ) : history.errorMessage !== null ? (
          <SuggestionSectionError
            message={history.errorMessage}
            onRetry={history.onRetry}
          />
        ) : history.rows.length === 0 ? (
          <SuggestionSectionEmpty title="아직 보낸 요청이 없어요">
            <p>필요한 것이 있으면 위에서 요청을 보내 주세요.</p>
          </SuggestionSectionEmpty>
        ) : (
          <SuggestionList rows={history.rows} />
        )}
      </section>
    </section>
  );
}

import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  ScreenHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { SuggestionForm } from './components/SuggestionForm';
import { SuggestionList } from './components/SuggestionList';
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
      <ScreenHeader
        backTo={memberRoutes.more}
        eyebrow="MEMBER · REQUEST"
        subtitle="필요한 것을 지점에 알리고 처리 상태를 확인해요."
        title="요청"
      />

      {/* The form and the history were stacked, so you had to scroll past the
       * form to read what you had already sent. Side by side, both are visible. */}
      <div className="member-suggestions__split">
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
            <SectionLoading label="요청 내역을 불러오는 중이에요." />
          ) : history.errorMessage !== null ? (
            <SectionError
              message={history.errorMessage}
              onRetry={history.onRetry}
            />
          ) : history.rows.length === 0 ? (
            <SectionEmpty title="아직 보낸 요청이 없어요">
              <p>필요한 것이 있으면 왼쪽에서 요청을 보내 주세요.</p>
            </SectionEmpty>
          ) : (
            <SuggestionList rows={history.rows} />
          )}
        </section>
      </div>
    </section>
  );
}

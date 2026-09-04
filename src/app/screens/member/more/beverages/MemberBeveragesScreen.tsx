import { Info, Plus } from 'lucide-react';
import { memberRoutes } from '../../../../core/router/routes';
import { useSession, type SessionOwnerKey } from '../../../../core/session';
import {
  Button,
  ScreenHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import { BeverageEditorModal } from './components/BeverageEditorModal';
import { BeverageList } from './components/BeverageList';
import { useMemberBeverages } from './hooks/useMemberBeverages';
import './styles/MemberBeveragesScreen.css';

export function MemberBeveragesScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberBeverages
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberBeverages({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const beverages = useMemberBeverages(memberId, queryOwnerKey);
  const { preference } = beverages;

  return (
    <section className="member-beverages">
      <ScreenHeader
        backTo={memberRoutes.more}
        eyebrow="MEMBER · BEVERAGE"
        subtitle="등록한 음료를 스텝이 매일 아침 준비해요."
        title="음료"
      />

      <section
        aria-labelledby="member-beverages-list-title"
        className="member-beverages__card"
      >
        <header className="member-beverages__card-header">
          <h3 id="member-beverages-list-title">내 음료</h3>
          {beverages.items.length > 0 && (
            <span>{beverages.items.length}잔</span>
          )}
        </header>

        {preference.loading ? (
          <SectionLoading label="음료 정보를 불러오는 중이에요." />
        ) : preference.errorMessage !== null ? (
          <SectionError
            message={preference.errorMessage}
            onRetry={preference.onRetry}
          />
        ) : beverages.items.length === 0 ? (
          <SectionEmpty title="등록한 음료가 없어요">
            <p>아래에서 마시고 싶은 음료를 등록해 주세요.</p>
          </SectionEmpty>
        ) : (
          <BeverageList
            items={beverages.items}
            onSelect={beverages.onOpenEdit}
          />
        )}

        <Button
          className="member-beverages__add"
          disabled={preference.loading || preference.errorMessage !== null}
          full
          onClick={beverages.onOpenAdd}
          variant="subtle"
        >
          <Plus aria-hidden="true" size={16} />
          음료 추가
        </Button>

        <p className="member-beverages__note">
          <Info aria-hidden="true" size={14} />
          <span>
            같은 음료를 두 잔 등록할 수도 있어요. 음료를 눌러 요청 사항을
            바꾸거나 삭제할 수 있습니다.
          </span>
        </p>
      </section>

      <BeverageEditorModal
        onClose={beverages.onCloseEditor}
        onDelete={beverages.onDelete}
        onSubmit={beverages.onSubmit}
        saving={beverages.saving}
        target={beverages.editorTarget}
      />
    </section>
  );
}

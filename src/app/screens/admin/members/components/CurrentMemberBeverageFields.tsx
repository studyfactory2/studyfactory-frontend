import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../../features/beverages/beverage-constraints';
import { DRINK_QUICK_PICKS } from '../../../../features/beverages/beverage-rules';
import {
  Button,
  Input,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { CurrentMemberBeverages } from '../hooks/useCurrentMemberBeverages';

export function CurrentMemberBeverageFields({
  beverages,
  saving,
  showErrors,
}: {
  beverages: CurrentMemberBeverages;
  saving: boolean;
  showErrors: boolean;
}) {
  const [customName, setCustomName] = useState('');
  const add = (name: string) => {
    if (!name.trim() || saving || !beverages.ready) return;
    beverages.onAdd(name);
    setCustomName('');
  };

  if (beverages.loading) {
    return <SectionLoading label="음료 정보를 불러오고 있어요." />;
  }
  if (!beverages.ready) {
    return (
      <SectionError
        message={beverages.errorMessage ?? '음료 정보를 확인하지 못했어요.'}
        onRetry={beverages.onRetry}
      />
    );
  }

  return (
    <div className="current-member-beverages">
      <p className="current-member-beverages__count">
        총 {beverages.items.length}잔
      </p>
      {beverages.items.length === 0 ? (
        <p className="current-member-beverages__empty">
          음료가 없어요. 아래에서 추가해 주세요.
        </p>
      ) : (
        <ol className="current-member-beverages__list">
          {beverages.items.map((item, index) => (
            <li className="current-member-beverages__row" key={item.key}>
              <span className="current-member-beverages__index">
                {index + 1}
              </span>
              <Input
                aria-label={`${index + 1}번째 음료 이름`}
                aria-invalid={showErrors && item.name.trim().length === 0}
                disabled={saving}
                maxLength={BEVERAGE_NAME_MAX_LENGTH}
                onChange={(event) =>
                  beverages.onPatch(item.key, { name: event.target.value })
                }
                placeholder="음료 이름"
                value={item.name}
              />
              <button
                aria-label={`${index + 1}번째 음료 삭제`}
                className="current-member-beverages__remove"
                disabled={saving}
                onClick={() => beverages.onRemove(item.key)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
              <Input
                aria-label={`${index + 1}번째 음료 메모`}
                className="current-member-beverages__note"
                disabled={saving}
                maxLength={BEVERAGE_NOTE_MAX_LENGTH}
                onChange={(event) =>
                  beverages.onPatch(item.key, { note: event.target.value })
                }
                placeholder="메모 (연하게, 얼음 적게…)"
                value={item.note ?? ''}
              />
            </li>
          ))}
        </ol>
      )}
      <div className="current-member-beverages__add">
        <span>추가</span>
        <div className="current-member-beverages__picks">
          {DRINK_QUICK_PICKS.map((name) => (
            <button
              disabled={saving}
              key={name}
              onClick={() => add(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="current-member-beverages__custom">
          <Input
            aria-label="직접 입력할 음료 이름"
            disabled={saving}
            maxLength={BEVERAGE_NAME_MAX_LENGTH}
            onChange={(event) => setCustomName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                add(customName);
              }
            }}
            placeholder="직접 입력"
            value={customName}
          />
          <Button
            disabled={saving || !customName.trim()}
            onClick={() => add(customName)}
            size="sm"
            variant="subtle"
          >
            <Plus aria-hidden="true" size={15} />
            추가
          </Button>
        </div>
      </div>
      {showErrors && beverages.invalid && (
        <p className="current-member-form__message" role="alert">
          음료 이름과 메모를 확인해 주세요. 음료 이름은 비워 둘 수 없어요.
        </p>
      )}
    </div>
  );
}

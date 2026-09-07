import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../member/more/beverages/model/beverage.types';
import { DRINK_QUICK_PICKS } from '../../../../features/beverages/beverage-rules';
import type { BeverageItemInput } from '../../../../features/beverages/beverages-api';
import { Button, Input, Modal } from '../../../../shared/ui';
import { formatMemberLabel } from '../model/staff-beverages';
import type { BeverageEditorTarget } from '../hooks/useStaffBeverages';

type BeverageMemberEditorProps = {
  onClose: () => void;
  onSave: (items: BeverageItemInput[]) => void;
  saving: boolean;
  target: BeverageEditorTarget | null;
};

/**
 * One member's whole drink list, edited as a draft and saved in one PATCH.
 * Unlike the member-side editor this shows every drink at once: staff open it
 * standing at a seat, and "make it one 아아 instead of two" has to be a glance
 * and a tap, not a modal per drink.
 */
export function BeverageMemberEditor({
  onClose,
  onSave,
  saving,
  target,
}: BeverageMemberEditorProps) {
  return (
    <Modal
      onClose={onClose}
      open={target !== null}
      size="sm"
      title={
        target ? formatMemberLabel(target.seatNumber, target.memberName) : ''
      }
    >
      {target !== null && (
        <EditorBody
          /* A fresh draft per member — and per refetch, so a save elsewhere
             never leaves this draft describing a list that no longer exists. */
          key={`${target.memberId}-${target.items.length}-${target.items.map((i) => i.name).join('|')}`}
          onClose={onClose}
          onSave={onSave}
          saving={saving}
          target={target}
        />
      )}
    </Modal>
  );
}

type DraftItem = BeverageItemInput & { id: number };

let nextDraftId = 1;

function toDraft(items: BeverageItemInput[]): DraftItem[] {
  return items.map((item) => ({ ...item, id: nextDraftId++ }));
}

function EditorBody({
  onClose,
  onSave,
  saving,
  target,
}: {
  onClose: () => void;
  onSave: (items: BeverageItemInput[]) => void;
  saving: boolean;
  target: BeverageEditorTarget;
}) {
  const [draft, setDraft] = useState<DraftItem[]>(() => toDraft(target.items));
  const [customName, setCustomName] = useState('');

  const cleaned = useMemo<BeverageItemInput[]>(
    () =>
      draft.map((item) => ({
        name: item.name.trim(),
        note: (item.note ?? '').trim() || null,
      })),
    [draft],
  );
  const hasBlankName = cleaned.some((item) => item.name.length === 0);
  const unchanged =
    cleaned.length === target.items.length &&
    cleaned.every(
      (item, index) =>
        item.name === target.items[index]?.name.trim() &&
        item.note === ((target.items[index]?.note ?? '').trim() || null),
    );

  const add = (name: string) => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return;
    }

    setDraft((current) => [
      ...current,
      { id: nextDraftId++, name: trimmed, note: null },
    ]);
    setCustomName('');
  };

  const update = (id: number, patch: Partial<BeverageItemInput>) =>
    setDraft((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const remove = (id: number) =>
    setDraft((current) => current.filter((item) => item.id !== id));

  return (
    <form
      className="staff-bev__editor"
      onSubmit={(event) => {
        event.preventDefault();

        if (!hasBlankName && !unchanged) {
          onSave(cleaned);
        }
      }}
    >
      {draft.length === 0 ? (
        <p className="staff-bev__editor-empty">
          음료가 없어요. 아래에서 추가해 주세요.
        </p>
      ) : (
        <ol className="staff-bev__editor-list">
          {draft.map((item, index) => (
            <li className="staff-bev__editor-row" key={item.id}>
              <span className="staff-bev__editor-index">{index + 1}</span>
              <Input
                aria-label={`${index + 1}번째 음료 이름`}
                disabled={saving}
                maxLength={BEVERAGE_NAME_MAX_LENGTH}
                onChange={(event) =>
                  update(item.id, { name: event.target.value })
                }
                placeholder="음료 이름"
                value={item.name}
              />
              <Input
                aria-label={`${index + 1}번째 음료 메모`}
                disabled={saving}
                maxLength={BEVERAGE_NOTE_MAX_LENGTH}
                onChange={(event) =>
                  update(item.id, { note: event.target.value })
                }
                placeholder="메모 (연하게, 얼음 적게…)"
                value={item.note ?? ''}
              />
              <button
                aria-label={`${item.name || '음료'} 삭제`}
                className="staff-bev__editor-remove"
                disabled={saving}
                onClick={() => remove(item.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="staff-bev__editor-add">
        <span className="staff-bev__editor-label">추가</span>
        <div className="staff-bev__editor-picks">
          {DRINK_QUICK_PICKS.map((name) => (
            <button
              className="staff-bev__editor-pick"
              disabled={saving}
              key={name}
              onClick={() => add(name)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="staff-bev__editor-custom">
          <Input
            aria-label="직접 입력할 음료 이름"
            disabled={saving}
            maxLength={BEVERAGE_NAME_MAX_LENGTH}
            onChange={(event) => setCustomName(event.target.value)}
            onKeyDown={(event) => {
              /* Enter here adds a drink; it must not submit the whole form. */
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                add(customName);
              }
            }}
            placeholder="직접 입력"
            value={customName}
          />
          <Button
            disabled={customName.trim().length === 0}
            onClick={() => add(customName)}
            size="sm"
            variant="subtle"
          >
            <Plus aria-hidden="true" size={15} />
            추가
          </Button>
        </div>
      </div>

      <div className="staff-bev__editor-actions">
        <Button onClick={onClose} variant="ghost">
          닫기
        </Button>
        <Button
          disabled={hasBlankName || unchanged}
          loading={saving}
          type="submit"
        >
          저장 · {cleaned.length}잔
        </Button>
      </div>
    </form>
  );
}

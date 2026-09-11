import type {
  PreRegistrationInput,
  PreRegistrationResponse,
} from '../../../../features/members/members-api';
import type { MemberRole } from '../../../../core/session';
import {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../member/more/beverages/model/beverage.types';
import { hasSeat, type CertificationLookup } from './admin-members';
import type { SeatChoice } from './member-seat-options';

/* Mirrors the request record: @Size(max = 50) on name, @Size(max = 100) on certification. */
export const PRE_REGISTRATION_NAME_MAX_LENGTH = 50;
export const PRE_REGISTRATION_CERTIFICATION_MAX_LENGTH = 100;

export type DrinkDraft = {
  /** Stable per row so a list edit never rekeys the inputs. */
  id: number;
  name: string;
  note: string;
};

/**
 * The certification as the operator sees it. A record only carries the
 * certification's id; the write needs its name. Until the certification list
 * can turn one into the other, the field holds the id and refuses to save —
 * initialising it as empty would silently erase the certification on PATCH.
 */
export type CertificationDraft =
  | { kind: 'text'; value: string }
  | { certificationId: number; kind: 'unresolved' };

export type PreRegistrationDraft = {
  certification: CertificationDraft;
  drinks: DrinkDraft[];
  /** YYYY-MM-DD from the date input, or '' when undecided. */
  expectedJoinDate: string;
  name: string;
  role: MemberRole;
  seatNumber: number | null;
};

let nextDrinkId = 1;

export function createDrinkDraft(name: string, note = ''): DrinkDraft {
  return { id: nextDrinkId++, name, note };
}

export function createEmptyDraft(): PreRegistrationDraft {
  return {
    certification: { kind: 'text', value: '' },
    drinks: [],
    expectedJoinDate: '',
    name: '',
    role: 'MEMBER',
    seatNumber: null,
  };
}

/** One drink per line, in stored order, blanks dropped. Commas are not separators here. */
export function splitDrinkSetting(drinkSetting: string) {
  return drinkSetting
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * Repeats stay repeats, in the order the roster stores them: two "아아" lines
 * become two rows. The note is stored per drink name, so every row sharing a
 * name shows the same note.
 */
export function draftFromRegistration(
  registration: PreRegistrationResponse,
  certificationName: string | null,
): PreRegistrationDraft {
  return {
    certification:
      registration.certificationId === null
        ? { kind: 'text', value: '' }
        : certificationName !== null
          ? { kind: 'text', value: certificationName }
          : {
              certificationId: registration.certificationId,
              kind: 'unresolved',
            },
    drinks: splitDrinkSetting(registration.drinkSetting).map((name) =>
      createDrinkDraft(name, registration.drinkNotes[name] ?? ''),
    ),
    expectedJoinDate: registration.expectedJoinDate ?? '',
    name: registration.name,
    role: registration.role,
    seatNumber: hasSeat(registration.seatNumber)
      ? registration.seatNumber
      : null,
  };
}

/**
 * A draft opened before the certification list answered keeps the id; once
 * the list has the name, the field reads as that name without the operator
 * touching it. Derived at render time so no state has to be patched later.
 */
export function resolveCertificationDraft(
  draft: PreRegistrationDraft,
  lookup: CertificationLookup,
): PreRegistrationDraft {
  if (draft.certification.kind === 'text') {
    return draft;
  }

  const name = lookup.byId.get(draft.certification.certificationId);

  return name === undefined
    ? draft
    : { ...draft, certification: { kind: 'text', value: name } };
}

/* ---------- seats ---------- */

/* ---------- validation ---------- */

export type DrinkDraftErrors = { name?: string; note?: string };

export type PreRegistrationDraftErrors = {
  certification?: string;
  drinks: Record<number, DrinkDraftErrors>;
  expectedJoinDate?: string;
  name?: string;
  seatNumber?: string;
};

/** "2026-02-30" has the right shape and is still not a day. */
export function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return false;
  }

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Everything the backend would reject, caught before the request, plus the
 * two things it would silently get wrong: a comma inside a drink name (the
 * preference parser splits on commas as well as line breaks, so "아아, 연하게"
 * would be stored as two drinks) and two different notes on one drink name
 * (notes are keyed by name, so only one could be kept).
 */
export function validateDraft(
  draft: PreRegistrationDraft,
  seatChoices: readonly SeatChoice[],
): PreRegistrationDraftErrors {
  const errors: PreRegistrationDraftErrors = { drinks: {} };
  const name = draft.name.trim();

  if (name === '') {
    errors.name = '이름을 입력해 주세요.';
  } else if (name.length > PRE_REGISTRATION_NAME_MAX_LENGTH) {
    errors.name = `이름은 ${PRE_REGISTRATION_NAME_MAX_LENGTH}자를 넘을 수 없어요.`;
  }

  if (
    draft.expectedJoinDate !== '' &&
    !isCalendarDate(draft.expectedJoinDate)
  ) {
    errors.expectedJoinDate =
      '입사 예정일을 YYYY-MM-DD 형식의 날짜로 입력해 주세요.';
  }

  if (draft.certification.kind === 'unresolved') {
    errors.certification =
      '자격증 이름을 아직 확인하지 못해 저장할 수 없어요. 확인될 때까지 기다리거나 아래에서 직접 입력해 주세요.';
  } else if (
    draft.certification.value.trim().length >
    PRE_REGISTRATION_CERTIFICATION_MAX_LENGTH
  ) {
    errors.certification = `자격증은 ${PRE_REGISTRATION_CERTIFICATION_MAX_LENGTH}자를 넘을 수 없어요.`;
  }

  if (draft.seatNumber !== null) {
    const choice = seatChoices.find(
      (candidate) => candidate.number === draft.seatNumber,
    );

    if (choice === undefined || choice.state === 'taken') {
      errors.seatNumber =
        '이미 사용 중이거나 배치도에 없는 좌석이에요. 다른 좌석을 선택해 주세요.';
    }
  }

  const noteByName = new Map<string, string>();

  for (const drink of draft.drinks) {
    const drinkName = drink.name.trim();
    const note = drink.note.trim();
    const drinkErrors: DrinkDraftErrors = {};

    if (drinkName === '') {
      drinkErrors.name = '음료 이름을 입력하거나 이 줄을 지워 주세요.';
    } else if (drinkName.includes(',')) {
      drinkErrors.name = '음료 이름에는 쉼표(,)를 쓸 수 없어요.';
    } else if (drinkName.length > BEVERAGE_NAME_MAX_LENGTH) {
      drinkErrors.name = `음료 이름은 ${BEVERAGE_NAME_MAX_LENGTH}자를 넘을 수 없어요.`;
    }

    if (note.length > BEVERAGE_NOTE_MAX_LENGTH) {
      drinkErrors.note = `메모는 ${BEVERAGE_NOTE_MAX_LENGTH}자를 넘을 수 없어요.`;
    } else if (drinkName !== '' && note !== '') {
      const existing = noteByName.get(drinkName);

      if (existing !== undefined && existing !== note) {
        drinkErrors.note =
          '같은 음료의 메모는 하나만 저장돼요. 메모를 같게 맞춰 주세요.';
      } else {
        noteByName.set(drinkName, note);
      }
    }

    if (drinkErrors.name !== undefined || drinkErrors.note !== undefined) {
      errors.drinks[drink.id] = drinkErrors;
    }
  }

  return errors;
}

export function hasDraftErrors(errors: PreRegistrationDraftErrors) {
  return (
    errors.name !== undefined ||
    errors.expectedJoinDate !== undefined ||
    errors.certification !== undefined ||
    errors.seatNumber !== undefined ||
    Object.keys(errors.drinks).length > 0
  );
}

/* ---------- serialisation ---------- */

type ResolvedDraft = PreRegistrationDraft & {
  certification: Extract<CertificationDraft, { kind: 'text' }>;
};

export function isCertificationResolved(
  draft: PreRegistrationDraft,
): draft is ResolvedDraft {
  return draft.certification.kind === 'text';
}

/**
 * The request the way the backend stores it: drinks one per line in display
 * order, repeats kept; notes keyed by drink name, first non-blank per name;
 * `drinkNotes` always present so the legacy single-note path is never used.
 */
export function toPreRegistrationInput(
  draft: ResolvedDraft,
): PreRegistrationInput {
  const drinkNotes: Record<string, string> = {};
  const names: string[] = [];

  for (const drink of draft.drinks) {
    const name = drink.name.trim();
    const note = drink.note.trim();

    if (name === '') {
      continue;
    }

    names.push(name);

    if (note !== '' && drinkNotes[name] === undefined) {
      drinkNotes[name] = note;
    }
  }

  const certification = draft.certification.value.trim();

  return {
    certification: certification === '' ? null : certification,
    drinkNotes,
    drinkSetting: names.join('\n'),
    expectedJoinDate:
      draft.expectedJoinDate === '' ? null : draft.expectedJoinDate,
    name: draft.name.trim(),
    role: draft.role,
    seatNumber: draft.seatNumber,
  };
}

/** Compares what would be saved, so reordering drinks counts and retyping the same name does not. */
export function draftSignature(draft: PreRegistrationDraft) {
  return JSON.stringify([
    draft.name.trim(),
    draft.role,
    draft.expectedJoinDate,
    draft.certification.kind === 'text'
      ? draft.certification.value.trim()
      : `#${draft.certification.certificationId}`,
    draft.seatNumber,
    draft.drinks.map((drink) => [drink.name.trim(), drink.note.trim()]),
  ]);
}

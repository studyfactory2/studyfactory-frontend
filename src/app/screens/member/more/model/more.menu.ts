import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  CupSoda,
  MessageSquareText,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { memberRoutes } from '../../../../core/router/routes';

/**
 * `pending` rows are features whose backend already exists but whose screens
 * have not been built yet.
 */
export type MoreMenuEntry =
  | {
      description: string;
      icon: LucideIcon;
      kind: 'link';
      label: string;
      to: string;
    }
  | { description: string; icon: LucideIcon; kind: 'pending'; label: string };

export type MoreMenuGroup = {
  entries: readonly MoreMenuEntry[];
  title: string;
};

export const MORE_MENU_GROUPS: readonly MoreMenuGroup[] = [
  {
    entries: [
      {
        description: '달력에서 휴무를 신청하고 취소해요.',
        icon: CalendarDays,
        kind: 'link',
        label: '휴무',
        to: memberRoutes.moreLeaves,
      },
      {
        description: '점심·저녁 반찬을 신청하고 확인해요.',
        icon: UtensilsCrossed,
        kind: 'link',
        label: '반찬',
        to: memberRoutes.moreSideDishes,
      },
      {
        description: '마시는 음료를 직접 등록하고 바꿔요.',
        icon: CupSoda,
        kind: 'link',
        label: '음료',
        to: memberRoutes.moreBeverages,
      },
    ],
    title: '생활',
  },
  {
    entries: [
      {
        description: '비품·학습·상담 요청을 보내고 처리 상태를 확인해요.',
        icon: MessageSquareText,
        kind: 'link',
        label: '요청',
        to: memberRoutes.moreSuggestions,
      },
    ],
    title: '문의',
  },
  {
    entries: [
      {
        description: '이름, 좌석, 소속 지점과 준비 중인 자격증을 확인해요.',
        icon: UserRound,
        kind: 'link',
        label: '내 정보',
        to: memberRoutes.moreProfile,
      },
    ],
    title: '계정',
  },
];

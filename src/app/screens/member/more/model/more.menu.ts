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
 * A flat field rather than groups in columns. Grouping by column left 문의 and
 * 계정 holding one card each next to a three-card 생활, so the desktop grid had
 * a hole in it by construction. The group now rides on the tile as a caption,
 * which keeps the information and loses the ragged shape.
 */
export type MoreMenuEntry = {
  description: string;
  group: string;
  icon: LucideIcon;
  label: string;
  to: string;
};

export const MORE_MENU_ENTRIES: readonly MoreMenuEntry[] = [
  {
    description: '달력에서 휴무를 신청하고 취소해요.',
    group: '생활',
    icon: CalendarDays,
    label: '휴무',
    to: memberRoutes.moreLeaves,
  },
  {
    description: '점심·저녁 반찬을 신청하고 확인해요.',
    group: '생활',
    icon: UtensilsCrossed,
    label: '반찬',
    to: memberRoutes.moreSideDishes,
  },
  {
    description: '마시는 음료를 직접 등록하고 바꿔요.',
    group: '생활',
    icon: CupSoda,
    label: '음료',
    to: memberRoutes.moreBeverages,
  },
  {
    description: '비품·학습·상담 요청을 보내고 처리 상태를 확인해요.',
    group: '문의',
    icon: MessageSquareText,
    label: '요청',
    to: memberRoutes.moreSuggestions,
  },
  {
    description: '이름, 좌석, 소속 지점과 준비 중인 자격증을 확인해요.',
    group: '계정',
    icon: UserRound,
    label: '내 정보',
    to: memberRoutes.moreProfile,
  },
];

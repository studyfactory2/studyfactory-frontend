import type { LucideIcon } from 'lucide-react';
import { GraduationCap, MessageCircle, Package, Sparkles } from 'lucide-react';
import type { SuggestionCategory } from '../../../../../features/suggestions/suggestions-api';

export type SuggestionCategoryOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: SuggestionCategory;
};

export const SUGGESTION_CATEGORY_OPTIONS: readonly SuggestionCategoryOption[] =
  [
    {
      description: '휴지, 문구, 정수기 등',
      icon: Package,
      label: '비품',
      value: 'SUPPLIES',
    },
    {
      description: '교재, 학습 환경 등',
      icon: GraduationCap,
      label: '학습',
      value: 'STUDY',
    },
    {
      description: '진로, 고민 상담 요청',
      icon: MessageCircle,
      label: '상담',
      value: 'COUNSELING',
    },
    {
      description: '그 밖의 건의사항',
      icon: Sparkles,
      label: '일반',
      value: 'GENERAL',
    },
  ];

export function getSuggestionCategoryLabel(category: SuggestionCategory) {
  return (
    SUGGESTION_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? '일반'
  );
}

/** Matches CompletedItemCleanupService.RETENTION_DAYS on the backend. */
export const RESOLVED_RETENTION_DAYS = 3;

export const SUGGESTION_CONTENT_MAX_LENGTH = 1_000;

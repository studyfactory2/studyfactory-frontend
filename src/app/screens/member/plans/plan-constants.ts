import type { PlanRow } from './plan-types';

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export const DAY_LONG_LABELS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
] as const;

export const PLAN_ROWS: PlanRow[] = [
  { duration: '90분', label: '1교시', periodIndex: 0, time: '09:00–10:30' },
  { duration: '80분', label: '2교시', periodIndex: 1, time: '10:45–12:05' },
  {
    duration: '75분',
    isBreak: true,
    label: '점심시간',
    periodIndex: 100,
    time: '12:05–13:20',
  },
  { duration: '70분', label: '3교시', periodIndex: 2, time: '13:20–14:30' },
  { duration: '90분', label: '4교시', periodIndex: 3, time: '14:45–16:15' },
  { duration: '80분', label: '5교시', periodIndex: 4, time: '16:30–17:50' },
  {
    duration: '75분',
    isBreak: true,
    label: '저녁시간',
    periodIndex: 101,
    time: '17:50–19:05',
  },
  { duration: '80분', label: '6교시', periodIndex: 5, time: '19:05–20:25' },
  { duration: '80분', label: '7교시', periodIndex: 6, time: '20:40–22:00' },
];

export const VISIBLE_PERIODS = new Set(PLAN_ROWS.map((row) => row.periodIndex));

export const WEEKLY_DRAFT_STORAGE_KEY = 'studyfactory.member-plan.weekly-draft';
export const MONTHLY_DRAFT_STORAGE_KEY =
  'studyfactory.member-plan.monthly-draft';
export const MEMBER_PLAN_SAVED_EVENT = 'studyfactory:member-plan-saved';

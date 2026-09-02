import type {
  MonthlyPlanGoalRequest,
  MonthlyPlanGoalResponse,
  WeeklyPlanItemRequest,
  WeeklyPlanResponse,
  WeeklyPlanSaveRequest,
} from '../../../api/member-plans-api';
import type { SessionOwnerKey } from '../../../core/session';

export type PlanRow = {
  duration: string;
  isBreak?: boolean;
  label: string;
  periodIndex: number;
  time: string;
};

export type EditablePlanItem = WeeklyPlanItemRequest & {
  draftId: string;
  id: number | null;
};

export type EditorCell = {
  dayIndex: number;
  periodIndex: number;
} | null;

export type StoredWeeklyDraft = {
  goal: string;
  items: EditablePlanItem[];
  memberId: number;
  revision: string;
  weekStartKey: string;
};

export type StoredMonthlyDraft = {
  goal: string;
  memberId: number;
  monthKey: string;
  revision: string;
};

export type WeeklySaveVariables = {
  draftRevision: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
  request: WeeklyPlanSaveRequest;
};

export type MonthlySaveVariables = {
  draftRevision: string;
  memberId: number;
  ownerKey: SessionOwnerKey;
  request: MonthlyPlanGoalRequest;
};

export type MemberPlanSavedDetail =
  | {
      draftRevision: string;
      kind: 'weekly';
      ownerKey: SessionOwnerKey;
      response: WeeklyPlanResponse;
    }
  | {
      draftRevision: string;
      kind: 'monthly';
      ownerKey: SessionOwnerKey;
      response: MonthlyPlanGoalResponse;
    };

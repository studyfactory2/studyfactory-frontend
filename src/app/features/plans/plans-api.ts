import { apiRequest, ApiRequestError } from '../../core/api/api-client';

export type WeeklyPlanItemResponse = {
  id: number;
  periodIndex: number;
  dayIndex: number;
  content: string;
  done: boolean;
  sortOrder: number;
};

export type WeeklyPlanResponse = {
  goalId: number | null;
  memberId: number;
  branchId: number;
  weekStartDate: string;
  goal: string;
  items: WeeklyPlanItemResponse[];
};

export type WeeklyPlanItemRequest = {
  periodIndex: number;
  dayIndex: number;
  content: string;
  done: boolean;
  sortOrder: number;
};

export type WeeklyPlanSaveRequest = {
  weekStartDate: string;
  goal: string;
  items: WeeklyPlanItemRequest[];
};

export type MonthlyPlanGoalResponse = {
  id: number | null;
  memberId: number;
  branchId: number;
  month: string;
  goal: string;
};

export type MonthlyPlanGoalRequest = {
  month: string;
  goal: string;
};

export async function fetchWeeklyPlan(
  weekStartDate: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ weekStartDate });
  const response = await apiRequest<WeeklyPlanResponse>(
    `/api/weekly-plans/me?${query}`,
    { expectedMemberId },
  );

  return validateWeeklyPlanResponse(response, expectedMemberId, weekStartDate);
}

/**
 * Read-only manager view of one member's weekly plan. The target branch is
 * checked as well as the member and week so an Admin changing operating branch
 * cannot silently render a response from the previous branch.
 */
export async function fetchMemberWeeklyPlan(
  targetMemberId: number,
  targetBranchId: number,
  weekStartDate: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ weekStartDate });
  const response = await apiRequest<WeeklyPlanResponse>(
    `/api/weekly-plans/members/${targetMemberId}?${query}`,
    { expectedMemberId },
  );

  return validateWeeklyPlanResponse(
    response,
    targetMemberId,
    weekStartDate,
    targetBranchId,
  );
}

export async function saveWeeklyPlan(
  request: WeeklyPlanSaveRequest,
  expectedMemberId: number,
) {
  const response = await apiRequest<WeeklyPlanResponse>(
    '/api/weekly-plans/me',
    {
      body: JSON.stringify(request),
      expectedMemberId,
      method: 'PUT',
    },
  );

  return validateWeeklyPlanResponse(
    response,
    expectedMemberId,
    request.weekStartDate,
  );
}

export async function fetchMonthlyPlanGoal(
  month: string,
  expectedMemberId: number,
) {
  const query = new URLSearchParams({ month });
  const response = await apiRequest<MonthlyPlanGoalResponse>(
    `/api/weekly-plans/monthly-goal/me?${query}`,
    { expectedMemberId },
  );

  return validateMonthlyGoalResponse(response, expectedMemberId, month);
}

export async function saveMonthlyPlanGoal(
  request: MonthlyPlanGoalRequest,
  expectedMemberId: number,
) {
  const response = await apiRequest<MonthlyPlanGoalResponse>(
    '/api/weekly-plans/monthly-goal/me',
    {
      body: JSON.stringify(request),
      expectedMemberId,
      method: 'PUT',
    },
  );

  return validateMonthlyGoalResponse(response, expectedMemberId, request.month);
}

function validateWeeklyPlanResponse(
  response: WeeklyPlanResponse,
  expectedMemberId: number,
  expectedWeekStartDate: string,
  expectedBranchId?: number,
) {
  if (
    response.memberId !== expectedMemberId ||
    response.weekStartDate !== expectedWeekStartDate ||
    (expectedBranchId !== undefined && response.branchId !== expectedBranchId)
  ) {
    throw invalidPlanResponseError();
  }

  return response;
}

function validateMonthlyGoalResponse(
  response: MonthlyPlanGoalResponse,
  expectedMemberId: number,
  expectedMonth: string,
) {
  if (
    response.memberId !== expectedMemberId ||
    response.month !== expectedMonth
  ) {
    throw invalidPlanResponseError();
  }

  return response;
}

function invalidPlanResponseError() {
  return new ApiRequestError(
    '요청한 회원 또는 기간과 다른 계획 응답을 받았습니다.',
    409,
  );
}

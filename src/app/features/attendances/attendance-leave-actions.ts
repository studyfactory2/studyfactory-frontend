import { ApiRequestError } from '../../core/api/api-client';
import {
  cancelMemberLeavePeriods,
  createMemberFixedLeaveBatch,
  deleteMemberFixedLeave,
  fetchFixedLeaves,
} from '../leaves/leaves-api';
import { applyDailyAttendanceReason } from './attendances-api';
import {
  attendanceReasonSuccessMessage,
  type AttendanceReasonCommand,
} from './workspace/model/attendance-board';

/** All four popup actions share the screen's member lock and scope snapshot. */
export async function executeAttendanceLeaveAction(
  command: AttendanceReasonCommand,
  branchId: number,
  operatorMemberId: number,
) {
  const { memberId, dates, slots, reason } = command;
  if (command.action === 'cancel') {
    const result = await cancelMemberLeavePeriods(
      { memberId, dates, slots },
      branchId,
      operatorMemberId,
    );
    return result.preservedPresentPeriodCount > 0
      ? `${result.cancelledPeriodCount}개 교시의 휴무를 취소하고, ${result.preservedPresentPeriodCount}개 교시의 출석 기록은 유지했어요.`
      : `${result.cancelledPeriodCount}개 교시의 휴무를 취소했어요.`;
  }
  if (command.action === 'repeat') {
    const result = await createMemberFixedLeaveBatch(
      { memberId, dates, slots, reason },
      branchId,
      operatorMemberId,
    );
    return `반복 일정 ${result.length}개를 신청했어요.`;
  }
  if (command.action === 'cancel-repeat') {
    // Refresh before deletion: an old popup must not delete an unrelated rule.
    const rules = await fetchFixedLeaves(branchId, operatorMemberId);
    const rule = rules.find(
      (item) => item.id === command.fixedLeaveId && item.memberId === memberId,
    );
    if (!rule)
      throw new ApiRequestError(
        '선택한 반복 일정이 변경되었어요. 다시 확인해 주세요.',
        409,
      );
    await deleteMemberFixedLeave(rule.id, operatorMemberId);
    return '선택한 반복 일정을 오늘부터 취소했어요.';
  }
  const result = await applyDailyAttendanceReason(
    { memberId, dates, slots, reason },
    branchId,
    operatorMemberId,
  );
  return attendanceReasonSuccessMessage(result);
}

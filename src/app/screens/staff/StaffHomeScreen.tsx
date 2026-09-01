import { staffNavigation } from '../../navigation/staff-navigation';
import { WorkspaceHomeScreen } from '../shared/WorkspaceHomeScreen';

const descriptions = [
  '회원의 입실과 퇴실 상태를 확인해요.',
  '오늘의 음료 제조와 서빙을 준비해요.',
  '스텝 휴무와 반찬 신청 업무를 관리해요.',
];

export function StaffHomeScreen() {
  return (
    <WorkspaceHomeScreen
      description="오늘 필요한 현장 업무를 순서대로 확인하고 준비하세요."
      eyebrow="STAFF HOME"
      links={staffNavigation.slice(1).map((item, index) => ({
        ...item,
        description: descriptions[index],
      }))}
      title="오늘의 운영을 준비해요."
    />
  );
}

import { adminNavigation } from './admin-navigation';
import { WorkspaceHomeScreen } from '../workspace/WorkspaceHomeScreen';

const descriptions = [
  '사전등록과 현재 사원 현황을 관리해요.',
  '출석과 현장 요청을 한곳에서 확인해요.',
  '휴무와 계획 등 지점 운영 업무를 관리해요.',
];

export function AdminHomeScreen() {
  return (
    <WorkspaceHomeScreen
      description="사원과 출석, 운영 현황을 지점 단위로 안전하게 관리하세요."
      eyebrow="ADMIN HOME"
      links={adminNavigation.slice(1).map((item, index) => ({
        ...item,
        description: descriptions[index],
      }))}
      title="오늘의 지점 운영을 확인하세요."
    />
  );
}

import { memberNavigation } from './member-navigation';
import { WorkspaceHomeScreen } from '../workspace/WorkspaceHomeScreen';

const descriptions = [
  '이번 주 작업 계획과 오늘 할 일을 확인해요.',
  '입실 기록과 누적 학습 시간을 살펴봐요.',
  '휴무 신청과 내 정보를 한곳에서 관리해요.',
];

export function MemberHomeScreen() {
  return (
    <WorkspaceHomeScreen
      description="계획과 기록을 연결해 오늘의 집중을 차분하게 이어가세요."
      eyebrow="MEMBER HOME"
      links={memberNavigation.slice(1).map((item, index) => ({
        ...item,
        description: descriptions[index],
      }))}
      title="오늘의 학습을 시작해요."
    />
  );
}

import { useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Textarea,
  useToast,
} from '../../shared/ui';
import './ui-kit-screen.css';

const swatches = [
  ['ink', '#1e3d32'],
  ['accent', '#e5934a'],
  ['accent-deep', '#c9741f'],
  ['positive', '#4f9d6b'],
  ['special', '#e9cd7c'],
  ['danger', '#cf5b4c'],
  ['card', '#fffdf8'],
  ['card-2', '#f0efe4'],
] as const;

export function UiKitScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  return (
    <main className="ui-kit">
      <div className="ui-kit__inner">
        <div>
          <h1 className="ui-kit__title">UI Kit — 숲</h1>
          <p className="ui-kit__subtitle">
            개발용 화면입니다. 모든 컴포넌트의 상태를 한눈에 확인합니다.
          </p>
        </div>

        <Card>
          <CardHeader title="팔레트" />
          <div className="ui-kit__swatches">
            {swatches.map(([name, hex]) => (
              <div className="ui-kit__swatch" key={name}>
                <i style={{ background: hex }} />
                {name}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="버튼" />
          <div className="ui-kit__row">
            <Button>기본</Button>
            <Button variant="ghost">고스트</Button>
            <Button variant="subtle">서브틀</Button>
            <Button variant="danger">삭제</Button>
            <Button loading>저장 중</Button>
            <Button disabled>비활성</Button>
          </div>
          <div className="ui-kit__row" style={{ marginTop: 'var(--space-3)' }}>
            <Button size="sm">작게</Button>
            <Button size="lg">크게</Button>
            <Button full variant="ghost">
              전체 너비
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="입력" />
          <div className="ui-kit__grid">
            <Field hint="실명을 입력해 주세요." label="이름" required>
              {(id) => <Input id={id} placeholder="김민준" />}
            </Field>
            <Field error="비밀번호가 올바르지 않습니다." label="비밀번호">
              {(id) => <Input id={id} type="password" defaultValue="1234" />}
            </Field>
            <Field label="지점">
              {(id) => (
                <Select defaultValue="" id={id}>
                  <option disabled value="">
                    지점 선택
                  </option>
                  <option>강남점</option>
                  <option>서초점</option>
                </Select>
              )}
            </Field>
            <Field label="비활성">
              {(id) => <Input disabled id={id} value="수정 불가" />}
            </Field>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Field label="건의 내용">
              {(id) => <Textarea id={id} placeholder="내용을 입력해 주세요." />}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            aside={<Badge tone="positive">배지</Badge>}
            title="배지 · 스피너"
          />
          <div className="ui-kit__row">
            <Badge>기본</Badge>
            <Badge tone="accent">음료 신청</Badge>
            <Badge dot tone="positive">
              입실 중
            </Badge>
            <Badge tone="special">특별휴무</Badge>
            <Badge tone="danger">미출석</Badge>
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
          </div>
        </Card>

        <Card padding="none">
          <Table>
            <thead>
              <tr>
                <th>이름</th>
                <th>좌석</th>
                <th>상태</th>
                <th>학습 시간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>김민준</td>
                <td>12</td>
                <td>
                  <Badge dot tone="positive">
                    입실 중
                  </Badge>
                </td>
                <td>4시간 32분</td>
              </tr>
              <tr>
                <td>이서연</td>
                <td>7</td>
                <td>
                  <Badge tone="special">특별휴무</Badge>
                </td>
                <td>—</td>
              </tr>
              <tr>
                <td>박지훈</td>
                <td>21</td>
                <td>
                  <Badge tone="neutral">퇴실</Badge>
                </td>
                <td>8시간 05분</td>
              </tr>
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="모달 · 토스트" />
          <div className="ui-kit__row">
            <Button onClick={() => setModalOpen(true)} variant="ghost">
              모달 열기
            </Button>
            <Button
              onClick={() => toast('저장되었습니다.', 'success')}
              variant="ghost"
            >
              성공 토스트
            </Button>
            <Button
              onClick={() => toast('요청을 처리하지 못했습니다.', 'error')}
              variant="ghost"
            >
              오류 토스트
            </Button>
            <Button onClick={() => toast('안내 메시지입니다.')} variant="ghost">
              안내 토스트
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="빈 상태" />
          <EmptyState
            action={<Button size="sm">휴무 신청하기</Button>}
            description="이번 주에 등록된 휴무 계획이 없습니다."
            icon={<CalendarX2 size={24} />}
            title="휴무 계획이 없어요"
          />
        </Card>
      </div>

      <Modal
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} variant="ghost">
              취소
            </Button>
            <Button onClick={() => setModalOpen(false)} variant="danger">
              삭제
            </Button>
          </>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        size="sm"
        title="휴무를 삭제할까요?"
      >
        <p>9월 3일(수) 휴무 신청이 삭제됩니다. 이 동작은 되돌릴 수 없습니다.</p>
      </Modal>
    </main>
  );
}

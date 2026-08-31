import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearSession, useSession } from '../../auth/session';
import { Button, SectionBadge } from '../../components/ui';
import { appRoutes } from '../../config/routes';
import { AppShell } from '../../layouts/AppShell';

type WorkspacePlaceholderScreenProps = {
  description: string;
  role: string;
};

export function WorkspacePlaceholderScreen({
  description,
  role,
}: WorkspacePlaceholderScreenProps) {
  const navigate = useNavigate();
  const session = useSession();

  const handleLogout = () => {
    clearSession();
    navigate(appRoutes.login, { replace: true });
  };

  return (
    <AppShell
      eyebrow={`${role.toUpperCase()} WORKSPACE`}
      title={`${session.memberName ?? role}님, 환영합니다.`}
    >
      <section className="foundation-card">
        <SectionBadge>Next feature area</SectionBadge>
        <p>{description}</p>
        <Button onClick={handleLogout} size="sm" variant="ghost">
          <LogOut size={15} />
          로그아웃
        </Button>
      </section>
    </AppShell>
  );
}

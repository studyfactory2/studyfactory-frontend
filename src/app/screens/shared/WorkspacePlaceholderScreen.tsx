import { SectionBadge } from '../../components/ui';
import { AppShell } from '../../layouts/AppShell';

type WorkspacePlaceholderScreenProps = {
  description: string;
  role: string;
};

export function WorkspacePlaceholderScreen({
  description,
  role,
}: WorkspacePlaceholderScreenProps) {
  return (
    <AppShell
      eyebrow={`${role.toUpperCase()} WORKSPACE`}
      title={`${role} workspace route is protected and ready.`}
    >
      <section className="foundation-card">
        <SectionBadge>Next feature area</SectionBadge>
        <p>{description}</p>
      </section>
    </AppShell>
  );
}

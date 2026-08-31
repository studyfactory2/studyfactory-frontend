import { SectionBadge } from '../../components/ui/SectionBadge';
import { AppShell } from '../../layouts/AppShell';

export function LoginScreen() {
  return (
    <AppShell
      eyebrow="STUDY FACTORY"
      title="A calmer operating system for a focused study day."
    >
      <section className="foundation-card">
        <SectionBadge>Frontend foundation</SectionBadge>
        <p>
          The new app shell, secure session boundary, role routes, and API layer
          are ready. The real sign-in form is the next slice.
        </p>
      </section>
    </AppShell>
  );
}

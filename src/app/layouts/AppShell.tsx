import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
};

export function AppShell({ children, eyebrow, title }: AppShellProps) {
  return (
    <main className="app-shell">
      <div
        className="app-shell__halo app-shell__halo--one"
        aria-hidden="true"
      />
      <div
        className="app-shell__halo app-shell__halo--two"
        aria-hidden="true"
      />
      <section className="app-shell__content">
        <p className="app-shell__eyebrow">{eyebrow}</p>
        <h1 className="app-shell__title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

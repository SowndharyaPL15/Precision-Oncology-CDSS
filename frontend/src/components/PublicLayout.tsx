import type { ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <PublicNavbar />
      <main style={{ flex: 1, paddingTop: '68px' }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

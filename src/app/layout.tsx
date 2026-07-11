import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vehicle Inventory Management',
  description: 'Fleet management system for tracking vehicle stock and trips',
};

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/items',
    label: 'Items',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    href: '/vehicles',
    label: 'Vehicles',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    href: '/trips',
    label: 'Trips',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    ),
  },
  {
    href: '/trips/new',
    label: 'New Trip',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen" style={{ background: 'var(--color-bg-page)', fontFamily: "'Inter', sans-serif" }}>

        {/* ── Left Sidebar ── */}
        <aside
          className="flex flex-col shrink-0"
          style={{
            width: '220px',
            background: 'var(--color-sidebar-bg)',
            borderRight: '1px solid var(--color-sidebar-border)',
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2 px-5"
            style={{ height: '64px', borderBottom: '1px solid var(--color-sidebar-border)' }}
          >
            {/* Teal brand mark */}
            <span
              className="flex items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ width: '28px', height: '28px', background: 'var(--color-accent)' }}
            >
              FI
            </span>
            <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--color-sidebar-fg)' }}>
              Depot
            </span>
          </div>

          {/* Section label */}
          <div className="px-5 pt-6 pb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-sidebar-muted)' }}>
              Overview
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-0.5 px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <span className="opacity-75">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User avatar section */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
          >
            <span
              className="flex items-center justify-center rounded-full text-white text-xs font-semibold shrink-0"
              style={{ width: '32px', height: '32px', background: 'var(--color-accent)' }}
            >
              U
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-sidebar-fg)' }}>
                Fleet User
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-sidebar-muted)' }}>
                Admin
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top bar */}
          <header
            className="flex items-center shrink-0 px-8"
            style={{
              height: '64px',
              background: 'var(--color-topbar-bg)',
              borderBottom: '1px solid var(--color-topbar-border)',
            }}
          >
            <h1 className="text-sm font-semibold" style={{ color: 'var(--color-topbar-fg)' }}>
               Depot - Inventory Management System
            </h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto px-8 py-8">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}

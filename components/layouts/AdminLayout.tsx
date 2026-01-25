import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Settings,
  LogOut,
  ArrowLeft,
  Eye,
  QrCode,
  Menu,
  X,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';

type NavItem = { label: string; icon: React.ElementType; path: string };

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const session = authService.getSession();
  const business = dataService.getBusinessBySlug(slug || '');

  // Desktop: sidebar is always visible. Mobile: drawer.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keep drawer closed by default; close drawer on desktop resize.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      if (mql.matches) setSidebarOpen(false);
    };
    sync();
    mql.addEventListener?.('change', sync);
    return () => mql.removeEventListener?.('change', sync);
  }, []);

  const handleLogout = () => {
    if (session?.impersonating) {
      authService.exitImpersonation();
      navigate('/super');
      return;
    }
    authService.logout();
    navigate(`/p/${slug}/login`);
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', icon: LayoutDashboard, path: `/p/${slug}/admin` },
      { label: 'Inbox', icon: Inbox, path: `/p/${slug}/admin/feedback` },
      { label: 'Links & QR', icon: QrCode, path: `/p/${slug}/admin/links` },
      { label: 'Settings', icon: Settings, path: `/p/${slug}/admin/settings` },
    ],
    [slug]
  );

  const dashBg = business?.theme.dashboardBackground || 'var(--rf-bg)';
  const cardBg = business?.theme.cardBackground || 'var(--rf-card-bg)';

  const sidebarWidthClass = sidebarCollapsed ? 'w-20' : 'w-72';

  const navLinkClass = (isActive: boolean) =>
    [
      'flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200',
      'hover:-translate-y-[1px]',
      sidebarCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3',
      isActive
        ? 'bg-[rgba(20,184,166,0.14)] text-[color:var(--rf-accent)] ring-1 ring-[var(--rf-border)]'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
    ].join(' ');

  const footerBtnClass = (tone: 'neutral' | 'danger' = 'neutral') =>
    [
      'w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px]',
      sidebarCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3',
      tone === 'danger'
        ? 'text-red-500 hover:bg-red-50'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
    ].join(' ');

  return (
    <div
      className="min-h-screen"
      style={
        {
          backgroundColor: dashBg,
          ['--rf-card-bg' as any]: cardBg,
          ['--rf-accent' as any]: business?.theme.accentColor || 'var(--rf-accent)',
          ['--rf-border' as any]: 'var(--rf-border)',
        } as React.CSSProperties
      }
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={[
            // mobile drawer
            'fixed md:sticky md:top-0 left-0 inset-y-0 z-40',
            'bg-white border-r border-[var(--rf-border)]',
            'flex flex-col',
            'transition-transform duration-200 md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            sidebarWidthClass,
          ].join(' ')}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--rf-border)] flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[color:var(--rf-accent)] flex items-center justify-center text-white font-bold text-xs">
                {business?.name?.charAt(0) || 'B'}
              </div>

              {!sidebarCollapsed && (
                <div className="truncate">
                  <h1 className="text-sm font-bold text-slate-900 truncate">{business?.name || 'Business'}</h1>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    Portal Admin
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Close drawer (mobile) */}
              <button
                className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                type="button"
              >
                <X size={18} />
              </button>

              {/* Collapse toggle (desktop) */}
              <button
                className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                type="button"
              >
                <ArrowLeft className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} size={18} />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) => navLinkClass(isActive)}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer actions */}
          <div className="p-4 border-t border-[var(--rf-border)] space-y-1">
            <a
              href={`#/r/${slug}`}
              target="_blank"
              rel="noreferrer"
              title={sidebarCollapsed ? 'View Public Link' : undefined}
              className={footerBtnClass('neutral')}
            >
              <Eye size={18} />
              {!sidebarCollapsed && <span>View Public Link</span>}
            </a>

            <button
              onClick={handleLogout}
              title={sidebarCollapsed ? (session?.impersonating ? 'Exit Impersonation' : 'Logout') : undefined}
              className={footerBtnClass('danger')}
              type="button"
            >
              {session?.impersonating ? <ArrowLeft size={18} /> : <LogOut size={18} />}
              {!sidebarCollapsed && (
                <span>{session?.impersonating ? 'Exit Impersonation' : 'Logout'}</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {showImpersonationBanner && (
            <div className="sticky top-0 z-50">
              <div className="h-1 bg-red-500" />
              <div className="bg-white/80 backdrop-blur border-b border-red-200 text-red-700 text-xs px-4 py-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Impersonation mode</span>
                  <span className="opacity-80">Editing</span>
                  <span className="font-semibold">{businessName}</span>
                </div>
                <span className="opacity-70">Any changes apply to this business only</span>
              </div>
            </div>
          )}


          {/* Mobile top bar (menu button) */}
          <div className="md:hidden px-4 pt-4">
            <button
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white ring-1 ring-[var(--rf-border)] text-slate-700"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              type="button"
            >
              <Menu size={18} />
            </button>
          </div>

          <main className="p-4 md:p-10">
            {/* Content centering wrapper (prevents awkward left gap perception) */}
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

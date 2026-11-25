import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { nav, L, type NavEntry } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { Icon, IconAction } from './ui';
import { canAccess, roleNames, useAdminAuth } from '../lib/admin-auth';
import { AccountDialog, type AccountDialogKind } from './account-dialog';
const icons: Record<string, string> = {
  'ad-01': 'grid', 'ad-02': 'hotel', 'ad-03': 'bed', 'ad-04': 'door', 'ad-05': 'calendar',
  'ad-06': 'tag', 'ad-07': 'clipboard', 'ad-08': 'key', 'ad-09': 'wallet', 'ad-10': 'sparkles',
  'ad-11': 'users', 'ad-12': 'percent', 'ad-13': 'shield', 'ad-14': 'chart',
};
const groups = [
  { key: 'overview', title: L('WORKSPACE', 'KHÔNG GIAN LÀM VIỆC') },
  { key: 'operations', title: L('OPERATIONS', 'VẬN HÀNH') },
  { key: 'property', title: L('PROPERTY', 'KHÁCH SẠN') },
  { key: 'business', title: L('BUSINESS', 'KINH DOANH') },
] as const;
function getPath() { return window.location.pathname.replace(/\/$/, '') || '/dashboard'; }
export function useAdminPath() {
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  const go = useCallback((url: string) => {
    if (url === path)
      return;
    window.history.pushState({}, '', url);
    setPath(url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [path]);
  return { path, go };
}
export function AdminShell({ path, go, children, legacyDialog }: {
  path: string;
  go: (url: string) => void;
  children: ReactNode;
  legacyDialog?: AccountDialogKind;
}) {
  const { t, language, setLanguage, theme, setTheme } = useLocale();
  const { user, logout } = useAdminAuth();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<AccountDialogKind | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogKind = dialog ?? legacyDialog;
  useEffect(() => {
    if (!menu)
      return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target))
        setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  const openAccount = (kind: AccountDialogKind, fromMenu = false) => {
    if (fromMenu)
      profileTriggerRef.current?.focus({ preventScroll: true });
    setMenu(false);
    setDialog(kind);
  };
  const closeAccount = () => {
    setDialog(null);
    if (legacyDialog)
      go('/dashboard');
  };
  const [signingOut, setSigningOut] = useState(false);
  const name = user?.fullName || user?.email || '';
  const initials = (user?.fullName ? user.fullName.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('') : name.slice(0, 2)).toUpperCase();
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // The local session is cleared even when offline.
    } finally {
      setSigningOut(false);
      go('/login');
    }
  };
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const active = nav.find(x => x.path === path) ?? nav[0];
  const filtered = nav.filter(x => user && canAccess(user.role, x.path) && t(x.label).toLowerCase().includes(query.toLowerCase()));
  return <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar" aria-label="Admin navigation">
      <div className="sidebar-brand">
        <div className="brand-logo" role="img" aria-label="Dylan Grand Hotel">
          <div className="admin-brand-horizontal" aria-hidden="true" />
        </div>
        <div className="brand-logo-compact" role="img" aria-label="Dylan Grand Hotel">
          <div className="admin-brand-symbol" aria-hidden="true" />
        </div>
        <button
          className="sidebar-collapse"
          title={t(L('Toggle sidebar', 'Thu gọn menu'))}
          aria-label={t(L('Toggle sidebar', 'Thu gọn menu'))}
          onClick={() => setCollapsed(x => !x)}
        >
          <Icon name="menu" size={19} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {groups.map(group => {
          const entries = filtered.filter(x => x.group === group.key);
          if (!entries.length)
            return null;
          return <div className="nav-group" key={group.key}>
            <div className="nav-group-title">
              {t(group.title)}
            </div>
            {entries.map((entry: NavEntry) => <button
              title={t(entry.label)}
              type="button"
              key={entry.id}
              className={`nav-link ${active.id === entry.id ? 'active' : ''}`}
              onClick={() => go(entry.path)}
            >
              <Icon name={icons[entry.id]} size={18} />
              <span className="nav-label">
                {t(entry.label)}
              </span>
              {active.id === entry.id && <span className="nav-active-bar" />}
            </button>)}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom" ref={profileRef}>
        <button
          type="button"
          ref={profileTriggerRef}
          className="sidebar-profile staff-profile-trigger"
          aria-expanded={menu}
          aria-controls={menu ? 'staff-profile-menu' : undefined}
          aria-label={t(L('Account menu', 'Menu tài khoản'))}
          onClick={() => setMenu(x => !x)}
        >
          <div className="avatar">
            {initials}
          </div>
          <div className="profile-details">
            <strong>
              {name}
            </strong>
            <span>
              {user && t(roleNames[user.role])}
            </span>
          </div>
          <Icon name="dots" size={18} />
        </button>
        {menu && <div className="staff-profile-menu" id="staff-profile-menu">
          <button type="button" onClick={() => openAccount('profile', true)}>
            <Icon name="users" size={17} />
            {t(L('My Profile', 'Hồ sơ cá nhân'))}
          </button>
          <button type="button" onClick={() => openAccount('password', true)}>
            <Icon name="key" size={17} />
            {t(L('Change password', 'Đổi mật khẩu'))}
          </button>
          <button type="button" disabled={signingOut} onClick={() => void signOut()}>
            <Icon name="arrow" size={17} />
            {t(L('Sign out', 'Đăng xuất'))}
          </button>
        </div>}
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            <span>
              {t(L('Dylan Grand', 'Dylan Grand'))}
            </span>
            <Icon name="chevron" size={14} />
            <strong>
              {t(active.label)}
            </strong>
          </div>
        </div>
        <div className="topbar-right">
          <div className="global-search">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t(L('Find a module…', 'Tìm module…'))}
              aria-label={t(L('Find a module', 'Tìm module'))}
            />

          </div>
          <div className="language-toggle" role="group" aria-label="Language">
            <button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button>
            <button className={language === 'vi' ? 'chosen' : ''} onClick={() => setLanguage('vi')}>VI</button>
          </div>
          <IconAction
            name={theme === 'light' ? 'moon' : 'sun'}
            label={t(L('Switch color theme', 'Đổi giao diện sáng tối'))}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          />
          <span className="topbar-separator" />
          <button
            type="button"
            className="topbar-avatar"
            title={name}
            aria-label={t(L('My Profile', 'Hồ sơ cá nhân'))}
            onClick={() => openAccount('profile')}
          >
            {initials}
          </button>
        </div>
      </header>
      <main className="workspace-content" id="content">
        {children}
        <footer className="workspace-footer">© Dylan Grand Hotel</footer>
      </main>
    </div>
    {dialogKind && <AccountDialog
      key={dialogKind}
      kind={dialogKind}
      onClose={closeAccount}
      onChangePassword={() => setDialog('password')}
      onSignedOut={() => go('/login')}
    />}
  </div>;
}

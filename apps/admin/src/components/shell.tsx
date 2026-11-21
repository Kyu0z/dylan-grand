import { useEffect, useState, type ReactNode } from 'react';
import { nav, L, type NavEntry } from '../lib/domain';
import { useLocale } from '../lib/locale';
import { Icon, IconAction } from './ui';

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
  const go = (url: string) => {
    if (url === path) return;
    window.history.pushState({}, '', url);
    setPath(url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  return { path, go };
}
export function AdminShell({ path, go, children }: { path: string; go: (url: string) => void; children: ReactNode; }) {
  const { t, language, setLanguage, theme, setTheme } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const active = nav.find(x => x.path === path) ?? nav[0];
  const filtered = nav.filter(x => t(x.label).toLowerCase().includes(query.toLowerCase()) || x.id.includes(query.toLowerCase()));
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
          onClick={() => setCollapsed(x => !x)}>
          <Icon name="menu" size={19} />
        </button>
      </div>
      <div className="sidebar-property">
        <div className="property-monogram" aria-label="Dylan Grand Hotel">
          <span className="admin-brand-symbol" aria-hidden="true" />
        </div>
        <div className="property-copy">
          <strong>Dylan Grand Hotel</strong>
          <span>
            {t(L('Property workspace', 'Quản lý khách sạn'))}
          </span>
        </div>
        <Icon name="down" size={15} />
      </div>
      <nav className="sidebar-nav">
        {groups.map(group => {
          const entries = filtered.filter(x => x.group === group.key);
          if (!entries.length) return null;
          return <div className="nav-group" key={group.key}>
            <div className="nav-group-title">
              {t(group.title)}
            </div>
            {entries.map((entry: NavEntry) => <button
              title={t(entry.label)}
              type="button"
              key={entry.id}
              className={`nav-link ${active.id === entry.id ? 'active' : ''}`}
              onClick={() => go(entry.path)}>
              <Icon name={icons[entry.id]} size={18} />
              <span className="nav-label">
                {t(entry.label)}
              </span>
              {active.id === entry.id && <span className="nav-active-bar" />}
            </button>)}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-support">
          <Icon name="info" size={17} />
          <span>
            {t(L('Portfolio demo environment', 'Môi trường demo portfolio'))}
          </span>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">DG</div>
          <div className="profile-details">
            <strong>Demo Administrator</strong>
            <span>
              {t(L('Presentation access', 'Truy cập bản trình diễn'))}
            </span>
          </div>
          <Icon name="dots" size={18} />
        </div>
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
              aria-label={t(L('Find a module', 'Tìm module'))} />
            <kbd>/</kbd>
          </div>
          <div className="language-toggle" role="group" aria-label="Language">
            <button className={language === 'en' ? 'chosen' : ''} onClick={() => setLanguage('en')}>EN</button>
            <button className={language === 'vi' ? 'chosen' : ''} onClick={() => setLanguage('vi')}>VI</button>
          </div>
          <IconAction
            name={theme === 'light' ? 'moon' : 'sun'}
            label={t(L('Switch color theme', 'Đổi giao diện sáng tối'))}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
          <span className="topbar-separator" />
          <div className="topbar-avatar" title="Demo Administrator">DG</div>
        </div>
      </header>
      <main className="workspace-content" id="content">
        <div className="demo-ribbon">
          <span className="live-dot" />
          {t(L('DEMO WORKSPACE', 'KHÔNG GIAN DEMO'))}
          <span className="ribbon-spacer" />
          {t(L('Sample data · No live backend connected', 'Dữ liệu minh họa · Chưa kết nối backend'))}
        </div>
        {children}
        <footer className="workspace-footer">© Dylan Grand Hotel <span>·</span> {t(L('Admin presentation · AD-01 to AD-14', 'Bản giao diện Admin · AD-01 đến AD-14'))}</footer>
      </main>
    </div>
  </div>;
}

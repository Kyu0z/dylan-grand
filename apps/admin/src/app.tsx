import { useEffect, useState } from 'react';
import { AdminShell, useAdminPath } from './components/shell';
import { Button, Card, Icon, Metric, PageHeader } from './components/ui';
import { AdminAuthProvider, canAccess, useAdminAuth } from './lib/admin-auth';
import { L, nav } from './lib/domain';
import { LocaleProvider, useLocale } from './lib/locale';
import { AuthPage, publicPaths } from './pages/auth';
import { StaffPage } from './pages/staff';
type DashboardData = {
  date: string;
  sellableRooms: number;
  totalBookings: number;
  arrivals: number;
  departures: number;
  dirtyRooms: number;
};
function Dashboard() {
  const { t } = useLocale();
  const { api } = useAdminAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    api<DashboardData>('/admin/dashboard')
      .then(result => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [api, attempt]);
  return <div className="page-stack">
    <PageHeader
      title={t(L('Overview', 'Tổng quan'))}
      description={data?.date}
      action={<Button variant="secondary" onClick={() => setAttempt(x => x + 1)}>
        {t(L('Refresh', 'Tải lại'))}
      </Button>}
    />
    {failed ? <Card>
      {t(L('Unable to load overview. Please retry.', 'Không thể tải tổng quan. Vui lòng thử lại.'))}
    </Card> : <div className="metric-grid three">
      <Metric
        label={t(L('Sellable rooms', 'Phòng có thể bán'))}
        value={data?.sellableRooms ?? '—'}
        icon="bed"
      />
      <Metric
        label={t(L('Total reservations', 'Tổng lượt đặt phòng'))}
        value={data?.totalBookings ?? '—'}
        icon="clipboard"
      />
      <Metric
        label={t(L('Arrivals today', 'Khách đến hôm nay'))}
        value={data?.arrivals ?? '—'}
        icon="key"
      />
      <Metric
        label={t(L('Departures today', 'Khách đi hôm nay'))}
        value={data?.departures ?? '—'}
        icon="door"
      />
      <Metric
        label={t(L('Dirty rooms', 'Phòng cần dọn'))}
        value={data?.dirtyRooms ?? '—'}
        icon="sparkles"
      />
    </div>}
  </div>;
}
function Router() {
  const { path, go } = useAdminPath();
  const { t } = useLocale();
  const { user, loading, sessionError, refresh, clear } = useAdminAuth();
  const isPublic = publicPaths.includes(path);
  useEffect(() => {
    if (loading || sessionError)
      return;
    if (!user && !isPublic)
      go('/login');
    else if (user && path === '/login')
      go('/dashboard');
  }, [path, user, loading, sessionError, isPublic, go]);
  if (isPublic && path !== '/login')
    return <AuthPage key={path} path={path} go={go} />;
  if (loading || sessionError)
    return <main className="auth-session-state">
      <Icon name="shield" size={32} />
      <p>
        {t(sessionError ? L('Unable to verify your session.', 'Không thể xác minh phiên đăng nhập.') : L('Checking your session…', 'Đang kiểm tra phiên đăng nhập…'))}
      </p>
      {sessionError && <>
        <Button onClick={() => void refresh()}>
          {t(L('Retry', 'Thử lại'))}
        </Button>
        <Button variant="secondary" onClick={() => { clear(); go('/login'); }}>
          {t(L('Sign in again', 'Đăng nhập lại'))}
        </Button>
      </>}
    </main>;
  if (!user)
    return <AuthPage key="login" path="/login" go={go} />;
  const legacyDialog = path === '/profile' ? 'profile' : path === '/profile/security' ? 'password' : undefined;
  const actual = path === '/' || path === '/login' || legacyDialog ? '/dashboard' : path;
  const entry = nav.find(x => x.path === actual);
  let content;
  if (!canAccess(user.role, actual))
    content = <Card title={t(L('Access denied', 'Không có quyền truy cập'))}>
      <Button onClick={() => go('/dashboard')}>
        {t(L('Back to overview', 'Về tổng quan'))}
      </Button>
    </Card>;
  else if (actual === '/dashboard')
    content = <Dashboard />;
  else if (actual === '/staff')
    content = <StaffPage />;
  else if (entry)
    content = <div className="page-stack">
      <PageHeader title={t(entry.label)} />
      <Card>
        <div className="module-unavailable">
          <Icon name="info" size={24} />
          <p>
            {t(L('This module is not available yet.', 'Chức năng này hiện chưa khả dụng.'))}
          </p>
        </div>
      </Card>
    </div>;
  else
    content = <Card title={t(L('Page not found', 'Không tìm thấy trang'))}>
      <Button onClick={() => go('/dashboard')}>
        {t(L('Back to overview', 'Về tổng quan'))}
      </Button>
    </Card>;
  return <AdminShell path={actual} go={go} legacyDialog={legacyDialog}>
    {content}
  </AdminShell>;
}
export default function App() {
  return <LocaleProvider>
    <AdminAuthProvider>
      <Router />
    </AdminAuthProvider>
  </LocaleProvider>;
}

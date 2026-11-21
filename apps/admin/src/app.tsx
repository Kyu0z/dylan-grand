import type { ReactNode } from 'react';
import { AdminShell, useAdminPath } from './components/shell';
import { DemoStoreProvider } from './lib/demo-store';
import { LocaleProvider } from './lib/locale';
import { Overview } from './pages/overview';
import { HotelContent, RoomTypesPage, PhysicalRoomsPage } from './pages/property';
import { InventoryPage } from './pages/inventory';
import { PricingPage } from './pages/pricing';
import { ReservationsPage } from './pages/reservations';
import { FrontDeskPage } from './pages/front-desk';
import { PaymentsPage, ReportsPage } from './pages/finance';
import { HousekeepingPage, GuestsPage, PromotionsPage, StaffPage } from './pages/operations';

function Router() {
  const { path, go } = useAdminPath();
  const routes: Record<string, ReactNode> = {
    '/': <Overview go={go} />,
    '/dashboard': <Overview go={go} />,
    '/hotel': <HotelContent />,
    '/room-types': <RoomTypesPage />,
    '/physical-rooms': <PhysicalRoomsPage />,
    '/inventory': <InventoryPage />,
    '/pricing': <PricingPage />,
    '/reservations': <ReservationsPage />,
    '/front-desk': <FrontDeskPage />,
    '/payments': <PaymentsPage />,
    '/housekeeping': <HousekeepingPage />,
    '/guests': <GuestsPage />,
    '/promotions': <PromotionsPage />,
    '/staff': <StaffPage />,
    '/reports': <ReportsPage />,
  };
  return <AdminShell path={path} go={go}>
    {routes[path] ?? <Overview go={go} />}
  </AdminShell>;
}

export default function App() {
  return <LocaleProvider>
    <DemoStoreProvider>
      <Router />
    </DemoStoreProvider>
  </LocaleProvider>;
}

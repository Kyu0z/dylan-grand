import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  demoBookings, demoGuests, demoPayments, demoPromotions, demoReviews, demoRooms,
  demoRoomTypes, demoServices, demoStaff,
  type Guest, type Payment, type Promotion, type Reservation, type Review, type Room, type RoomType, type Service, type Staff,
} from './domain';

type Data = {
  bookings: Reservation[];
  rooms: Room[];
  roomTypes: RoomType[];
  payments: Payment[];
  guests: Guest[];
  reviews: Review[];
  promotions: Promotion[];
  services: Service[];
  staff: Staff[];
};
type DataKey = keyof Data;
type Store = Data & {
  update: <K extends DataKey>(key: K, items: Data[K]) => void;
  reset: () => void;
};
const initial: Data = {
  bookings: demoBookings,
  rooms: demoRooms,
  roomTypes: demoRoomTypes,
  payments: demoPayments,
  guests: demoGuests,
  reviews: demoReviews,
  promotions: demoPromotions,
  services: demoServices,
  staff: demoStaff,
};
const STORAGE_KEY = 'dgh-admin-presentation-v1';
function initialData(): Data {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Data> | null;
    if (value && typeof value === 'object') {
      const copy: Data = { ...initial };
      (Object.keys(initial) as DataKey[]).forEach((key) => {
        if (Array.isArray(value[key])) (copy as Record<string, unknown>)[key] = value[key];
      });
      return copy;
    }
  } catch { /* No storage: use demo defaults. */ }
  return initial;
}
const Context = createContext<Store | null>(null);
export function DemoStoreProvider({ children }: { children: ReactNode; }) {
  const [data, setData] = useState<Data>(initialData);
  const update = useCallback(<K extends DataKey>(key: K, items: Data[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: items };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Optional persistence. */ }
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    setData(initial);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Optional persistence. */ }
  }, []);
  const value = useMemo(() => ({ ...data, update, reset }), [data, update, reset]);
  return <Context.Provider value={value}>
    {children}
  </Context.Provider>;
}
export const useDemoStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error('useDemoStore requires DemoStoreProvider');
  return store;
};

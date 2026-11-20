import { addDays, dayISO, type RoomId } from './data';
export type Stay = {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  count: number;
  room: RoomId;
  rate: 'flexible' | 'advance';
  breakfast: boolean;
  transfer: boolean;
  lateCheckout: boolean;
  promo: string;
};
export type Guest = { firstName: string; lastName: string; email: string; phone: string; notes: string; };
export type Booking = {
  code: string;
  room: RoomId;
  checkin: string;
  checkout: string;
  adults: number;
  count: number;
  rate: Stay['rate'];
  guest: string;
  email: string;
  total: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  breakfast: boolean;
  transfer: boolean;
  lateCheckout: boolean;
  isDemo: true;
};
export type Account = { name: string; email: string; phone?: string; preferences?: string; };
const prefix = 'dylan-grand-v3-';
export const defaultStay = (): Stay => ({
  checkin: addDays(dayISO(), 14),
  checkout: addDays(dayISO(), 17),
  adults: 2,
  children: 0,
  count: 1,
  room: 'deluxe',
  rate: 'flexible',
  breakfast: false,
  transfer: false,
  lateCheckout: false,
  promo: ''
});
export const read = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(prefix + key);
    return v ? JSON.parse(v) as T : fallback;
  } catch {
    return fallback;
  }
};
export const write = <T,>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(prefix + key, JSON.stringify(value));
    window.dispatchEvent(new Event('dylan-storage'));
  }
};
export const getStay = () => ({ ...defaultStay(), ...read<Partial<Stay>>('stay', {}) });
export const saveStay = (patch: Partial<Stay>) => {
  const next = { ...getStay(), ...patch };
  write('stay', next);
  return next;
};
export const getBookings = () => read<Booking[]>('bookings', []);
export const saveBookings = (items: Booking[]) => write('bookings', items);
export const getAccount = () => read<Account | null>('account', null);
export const getCurrentUser = () => read<string | null>('current-user', null);
export const getWishlist = () => read<string[]>('wishlist', []);
export const toggleWishlist = (id: string) => {
  const current = getWishlist();
  const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
  write('wishlist', next);
  return next;
};
export const getReviews = () => read<{ name: string; rating: number; message: string; createdAt: string; }[]>('reviews', []);

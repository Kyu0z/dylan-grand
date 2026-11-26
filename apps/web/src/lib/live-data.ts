'use client';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/components/language-provider';
import { apiRequest } from './api-client';
import { roomArtwork as artwork, photos, type Room } from './data';
export type Hotel = {
  nameEn: string;
  nameVi: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  descriptionEn: string | null;
  descriptionVi: string | null;
  checkInTime: string;
  checkOutTime: string;
};
export type RoomRecord = {
  code: string;
  nameEn: string;
  nameVi: string;
  maxGuests: number;
  baseRateVnd: number;
  descriptionEn: string | null;
  descriptionVi: string | null;
  sizeSqm: number | null;
  bedsEn: string | null;
  bedsVi: string | null;
  viewEn: string | null;
  viewVi: string | null;
  amenities: string[];
  imageUrls: string[];
};
export type Service = {
  code: string;
  name: string;
  unit: string;
  priceVnd: number;
  nameVi?: string | null;
  unitVi?: string | null;
  eyebrowEn?: string | null;
  eyebrowVi?: string | null;
  descriptionEn?: string | null;
  descriptionVi?: string | null;
  imageUrl?: string | null;
};
export type Review = {
  id: string;
  stars: number;
  comment: string;
  response: string | null;
  createdAt: string;
};
export type Availability = {
  checkIn: string;
  checkOut: string;
  roomTypes: {
    roomTypeCode: string;
    roomTypeName: string;
    availableRooms: number;
    totalRoomPriceVnd: number;
    nights: number;
  }[];
};
export type BookingRecord = {
  code: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: string;
  ratePlan: string;
  roomType: {
    code: string;
    nameEn: string;
    nameVi: string;
  };
  guest: {
    name: string;
    email: string;
  };
  totalVnd: number;
  roomTotalVnd: number;
  discountVnd: number;
  extraTotalVnd: number;
  cancelFeeVnd: number;
  dueVnd: number;
  paidVnd: number;
  balanceVnd: number;
  createdAt: string;
  lookupToken?: string;
  hasReview?: boolean;
};
export type RatePolicy = { code: string; discountPercent: number; freeCancellationHours: number | null; lateFee: string; noShowFee: string; active: boolean; };
export type Quote = {
  ratePolicy: RatePolicy;
  rateLines: { date: string; amountVnd: number; }[];
  rateKey: string;
  roomTotalVnd: number;
  discountVnd: number;
  extraTotalVnd: number;
  totalVnd: number;
  nights: number;
  availableRooms: number;
};
export function useLiveData<T>(path: string | null, token?: string) {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    failed: boolean;
  }>({ key: '', data: null, loading: true, failed: false });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  const key = JSON.stringify([path, token, revision]);
  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ key, data: null, loading: false, failed: false });
      return;
    }
    setState({ key, data: null, loading: true, failed: false });
    apiRequest<T>(path, { token, notifications: 'none' }).then(({ data }) => {
      if (active)
        setState({ key, data, loading: false, failed: false });
    }).catch(() => {
      if (active)
        setState({ key, data: null, loading: false, failed: true });
    });
    return () => {
      active = false;
    };
  }, [path, token, key]);
  return { ...(state.key === key ? state : { key, data: null, loading: !!path, failed: false }), reload };
}
export function useRooms() {
  const { locale } = useI18n();
  const d = useLiveData<RoomRecord[]>('/rooms');
  const rooms = useMemo<Room[]>(() => (d.data ?? []).filter(r => r.baseRateVnd > 0).map(r => ({
    id: r.code,
    name: (locale === 'vi' ? r.nameVi : r.nameEn) || r.nameEn,
    subtitle: locale === 'vi' ? 'Hạng phòng' : 'Room type',
    size: r.sizeSqm ?? 0,
    guests: r.maxGuests,
    beds: (locale === 'vi' ? r.bedsVi : r.bedsEn) || '',
    view: (locale === 'vi' ? r.viewVi : r.viewEn) || '',
    price: r.baseRateVnd,
    available: 0,
    description: (locale === 'vi' ? r.descriptionVi : r.descriptionEn) || '',
    amenities: r.amenities ?? [],
    images: r.imageUrls?.length ? r.imageUrls : (artwork.find(a => a.id === r.code)?.images ?? [photos.interior])
  })), [d.data, locale]);
  return { ...d, rooms };
}
export function bookingStatus(status: string, locale: 'en' | 'vi') {
  const names: Record<string, [
    string,
    string
  ]> = {
    PENDING: ['Pending hold', 'Đang giữ chỗ'],
    CONFIRMED: ['Confirmed', 'Đã xác nhận'],
    CHECKED_IN: ['Checked in', 'Đã nhận phòng'],
    CHECKED_OUT: ['Checked out', 'Đã trả phòng'],
    CANCELLED: ['Cancelled', 'Đã hủy'],
    EXPIRED: ['Expired', 'Hết hạn'],
    NO_SHOW: ['No-show', 'Không đến']
  };
  return names[status]?.[locale === 'vi' ? 1 : 0] ?? status;
}
const guestKey = 'dgh-guest-booking-access-v1';
export type BookingAccess = {
  code: string;
  lookupToken: string;
};
export function getGuestAccess(): BookingAccess[] {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(guestKey) || '[]');
    return Array.isArray(data) ? data.filter(x => x && typeof x.code === 'string' && typeof x.lookupToken === 'string') : [];
  }
  catch {
    return [];
  }
}
export function saveGuestAccess(access: BookingAccess) {
  try {
    sessionStorage.setItem(guestKey, JSON.stringify([access, ...getGuestAccess().filter(x => x.code !== access.code)].slice(0, 30)));
  }
  catch { /* customer can copy the lookup key */ }
}
import { getCustomerToken } from './customer-auth';
import { getWishlist, toggleWishlist } from './storage';
type WishlistState = {
  token: string;
  codes: string[];
  loading: boolean;
  failed: boolean;
};

type WishlistContextValue = {
  codes: string[];
  toggle: (code: string) => Promise<void>;
  loading: boolean;
  failed: boolean;
};

const WishlistContext = createContext<(WishlistContextValue & { ensure: () => void; }) | null>(null);

// Deduplicate overlapping GETs (including React development Strict Mode).
const pendingWishlist = new Map<string, Promise<{ codes: string[]; }>>();
function fetchWishlist(token: string) {
  const pending = pendingWishlist.get(token);
  if (pending) return pending;
  const request = apiRequest<{ codes: string[]; }>('/me/wishlist', {
    token,
    notifications: 'none',
  }).then(({ data }) => data).finally(() => pendingWishlist.delete(token));
  pendingWishlist.set(token, request);
  return request;
}

export function WishlistProvider({ children }: { children: ReactNode; }) {
  const [token, setToken] = useState<string | undefined>();
  const [guest, setGuest] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [requested, setRequested] = useState(false);
  const ensure = useCallback(() => setRequested(true), []);
  const [revision, setRevision] = useState(0);
  const [remote, setRemote] = useState<WishlistState | null>(null);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const mutationLock = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setToken(getCustomerToken());
      const next = getWishlist();
      setGuest(previous => previous.length === next.length && previous.every((code, i) => code === next[i]) ? previous : next);
      setInitialized(true);
    };
    sync();
    window.addEventListener('dylan-storage', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('dylan-storage', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!token || !requested) {
      setRemote(null);
      return;
    }
    setRemote({ token, codes: [], loading: true, failed: false });
    fetchWishlist(token).then(({ codes }) => {
      if (active && getCustomerToken() === token) {
        setRemote({ token, codes, loading: false, failed: false });
      }
    }).catch(() => {
      if (active && getCustomerToken() === token) {
        setRemote({ token, codes: [], loading: false, failed: true });
      }
    });
    return () => { active = false; };
  }, [token, requested, revision]);

  const current = remote?.token === token ? remote : null;
  const codes = token ? (current?.codes ?? []) : guest;
  const loading = !initialized || Boolean(token && (!current || current.loading || busyToken === token));
  const failed = Boolean(token && current?.failed);

  useEffect(() => {
    if (!failed) return;
    const retry = () => setRevision(value => value + 1);
    window.addEventListener('focus', retry);
    return () => window.removeEventListener('focus', retry);
  }, [failed]);

  const toggle = useCallback(async (code: string) => {
    if (!initialized || getCustomerToken() !== token) return;
    if (!token) {
      setGuest(toggleWishlist(code));
      return;
    }
    if (loading || failed || mutationLock.current === token) return;
    mutationLock.current = token;
    setBusyToken(token);
    try {
      // The existing PUT returns the complete updated wishlist; no follow-up GET is needed.
      const { data } = await apiRequest<{ codes: string[]; }>(`/me/wishlist/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: { saved: !codes.includes(code) },
        token,
      });
      if (getCustomerToken() === token) {
        setRemote({ token, codes: data.codes, loading: false, failed: false });
      }
    } finally {
      if (mutationLock.current === token) mutationLock.current = null;
      setBusyToken(value => value === token ? null : value);
    }
  }, [initialized, token, loading, failed, codes]);

  const value = useMemo(() => ({ codes, toggle, loading, failed, ensure }), [codes, toggle, loading, failed, ensure]);
  return createElement(WishlistContext.Provider, { value }, children);
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  const ensure = context?.ensure;
  useEffect(() => { ensure?.(); }, [ensure]);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider.');
  return context;
}

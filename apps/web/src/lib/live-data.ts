'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
export type Quote = {
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
export function useWishlist() {
  const [token, setToken] = useState<string | undefined>();
  const [guest, setGuest] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const sync = () => {
      setToken(getCustomerToken());
      setGuest(getWishlist());
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
  const d = useLiveData<{
    codes: string[];
  }>(token ? '/me/wishlist' : null, token);
  const codes = token ? (d.data?.codes ?? []) : guest;
  useEffect(() => {
    if (!token)
      return;
    const sync = () => d.reload();
    window.addEventListener('dgh-wishlist', sync);
    return () => window.removeEventListener('dgh-wishlist', sync);
  }, [token, d.reload]);
  async function toggle(code: string) {
    if (!initialized)
      return;
    if (!token) {
      toggleWishlist(code);
      return;
    }
    await apiRequest(`/me/wishlist/${encodeURIComponent(code)}`, { method: 'PUT', body: { saved: !codes.includes(code) }, token });
    window.dispatchEvent(new Event('dgh-wishlist'));
  }
  return { codes, toggle, loading: !initialized || Boolean(token && d.loading), failed: Boolean(token && d.failed) };
}

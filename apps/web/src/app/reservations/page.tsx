'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/language-provider';
import { PageIntro, Eyebrow } from '@/components/ui';
import { apiRequest } from '@/lib/api-client';
import { getCustomerToken } from '@/lib/customer-auth';
import { bookingStatus, getGuestAccess, saveGuestAccess, type BookingRecord, type BookingAccess } from '@/lib/live-data';
import { money, prettyDate } from '@/lib/data';
export default function ReservationsPage() {
  const { locale } = useI18n();
  const tr = (en: string, vi: string) => locale === 'vi' ? vi : en;
  const [token, setToken] = useState<string | undefined>();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [access, setAccess] = useState<BookingAccess[]>([]);
  const [lookup, setLookup] = useState({ code: '', lookupToken: '' });
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [dialog, setDialog] = useState<'cancel' | 'review' | null>(null);
  const [reason, setReason] = useState('');
  const [stars, setStars] = useState(5);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const lastToken = useRef<string | null | undefined>(null);
  const reload = async (currentToken = getCustomerToken(), keys = getGuestAccess()) => {
    const run = ++generation.current;
    setLoading(true);
    setFailed(false);
    try {
      const own = currentToken ? (await apiRequest<BookingRecord[]>('/me/bookings', { token: currentToken, notifications: 'none' })).data : [];
      const guests = await Promise.allSettled(keys.map(k => apiRequest<BookingRecord>('/bookings/lookup', { method: 'POST', body: k, notifications: 'none' })));
      if (run !== generation.current)
        return;
      const all = [...own, ...guests.flatMap(r => r.status === 'fulfilled' ? [r.value.data] : [])];
      setBookings([...new Map(all.map(b => [b.code, b])).values()]);
      setFailed(guests.some(r => r.status === 'rejected'));
    }
    catch {
      if (run === generation.current) {
        setBookings([]);
        setFailed(true);
      }
    }
    finally {
      if (run === generation.current)
        setLoading(false);
    }
  };
  useEffect(() => {
    lastToken.current = null;
    const sync = () => {
      const current = getCustomerToken();
      if (lastToken.current === current)
        return;
      lastToken.current = current;
      const keys = getGuestAccess();
      setToken(current);
      setBookings([]);
      setAccess(keys);
      setSelected(null);
      setDialog(null);
      void reload(current, keys);
    };
    sync();
    window.addEventListener('dylan-storage', sync);
    return () => {
      generation.current++;
      window.removeEventListener('dylan-storage', sync);
    };
  }, []);
  const run = async (fn: () => Promise<void>) => {
    if (lock.current)
      return;
    lock.current = true;
    setBusy(true);
    try {
      await fn();
    }
    catch { /* shared API toast */ }
    finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const lookupBooking = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const key = { code: lookup.code.trim().toUpperCase(), lookupToken: lookup.lookupToken.trim() };
      const { data } = await apiRequest<BookingRecord>('/bookings/lookup', { method: 'POST', body: key, notifications: 'errors' });
      saveGuestAccess(key);
      setAccess(getGuestAccess());
      setBookings(old => [data, ...old.filter(b => b.code !== data.code)]);
      setSelected(data);
      setLookup({ code: '', lookupToken: '' });
    });
  };
  const mutate = (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !dialog)
      return;
    void run(async () => {
      const lookupToken = access.find(a => a.code === selected.code)?.lookupToken;
      const body = { ...(dialog === 'cancel' ? { reason: reason.trim() } : { stars, comment: reason.trim() }), ...(lookupToken ? { lookupToken } : {}) };
      await apiRequest(`/bookings/${encodeURIComponent(selected.code)}/${dialog}`, { method: 'POST', body, token });
      setDialog(null);
      setSelected(null);
      setReason('');
      await reload();
    });
  };
  const roomName = (b: BookingRecord) => locale === 'vi' ? b.roomType.nameVi : b.roomType.nameEn;
  return <>
    <PageIntro
      crumb={tr('MY RESERVATIONS', 'ĐẶT PHÒNG CỦA TÔI')}
      title={tr('Your time', 'Kỳ nghỉ')}
      italic={tr('with us.', 'của bạn.')}
      description={tr('View and manage your confirmed and past stays.', 'Xem và quản lý các kỳ nghỉ hiện tại và trước đây.')}
    />
    <section className="container-site pb-24 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-4xl">
            {tr('Your reservations', 'Đặt phòng của bạn')}
          </h2>
          <button className="btn-outline" onClick={() => void reload()}>
            {tr('Refresh', 'Tải lại')}
          </button>
        </div>
        {loading ? <p>
          {tr('Loading reservations…', 'Đang tải đặt phòng…')}
        </p> : null}
        {failed && <p role="alert">
          {tr('Some reservations could not be loaded. Retry or use your private lookup key.', 'Không tải được một số đặt phòng. Thử lại hoặc dùng mã tra cứu riêng.')}
        </p>}
        {!loading && !bookings.length && !failed && <div className="border border-line bg-paper p-7">
          <p>
            {tr('No reservations found.', 'Chưa có đặt phòng.')}
          </p>
          <Link className="btn-primary mt-5" href="/availability">
            {tr('BOOK A STAY', 'ĐẶT PHÒNG')}
          </Link>
        </div>}
        {bookings.map(b => <article key={b.code} className="border border-line bg-paper p-6 mb-5">
          <div className="flex flex-wrap justify-between gap-3">
            <Eyebrow>
              {b.code}
            </Eyebrow>
            <span>
              {bookingStatus(b.status, locale)}
            </span>
          </div>
          <h3 className="font-display text-4xl mt-4">
            {roomName(b)}
          </h3>
          <p className="body-copy">{prettyDate(b.checkIn.slice(0, 10), locale)} – {prettyDate(b.checkOut.slice(0, 10), locale)}</p>
          <p className="body-copy">
            {b.guest.name}
          </p>
          <div className="mt-4 flex flex-wrap justify-between gap-4">
            <strong>
              {money(b.dueVnd)}
            </strong>
            <button className="btn-outline" onClick={() => {
              setSelected(b);
              setDialog(null);
            }}>
              {tr('Details', 'Chi tiết')}
            </button>
          </div>
        </article>)}
        {selected && <section className="border border-line bg-paper p-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-3xl">
              {selected.code}
            </h3>
            <button
              className="btn-outline"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setDialog(null);
              }}
            >
              {tr('Close', 'Đóng')}
            </button>
          </div>
          <div className="grid gap-3 my-6 text-sm">
            {[
              [tr('Booking status', 'Trạng thái'), bookingStatus(selected.status, locale)],
              [tr('Amount due', 'Phải trả'), money(selected.dueVnd)],
              [tr('Net paid', 'Đã thanh toán ròng'), money(selected.paidVnd)],
              [tr('Balance', 'Còn phải trả'), money(selected.balanceVnd)],
              [tr('Cancellation fee', 'Phí hủy'), money(selected.cancelFeeVnd)]
            ].map(([k, v]) => <div className="flex justify-between" key={k}>
              <span>
                {k}
              </span>
              <strong>
                {v}
              </strong>
            </div>)}
          </div>
          <div className="flex gap-3 flex-wrap">
            {['PENDING', 'CONFIRMED'].includes(selected.status) && <button className="btn-outline" onClick={() => {
              setReason('');
              setDialog('cancel');
            }}>
              {tr('Cancel reservation', 'Hủy đặt phòng')}
            </button>}
            {selected.status === 'CHECKED_OUT' && !selected.hasReview && <button className="btn-primary" onClick={() => {
              setReason('');
              setDialog('review');
            }}>
              {tr('Write a review', 'Viết đánh giá')}
            </button>}
          </div>
          {dialog && <form className="mt-6 grid gap-4" onSubmit={mutate}>
            {dialog === 'cancel' ? <p className="body-copy">
              {tr('The server calculates cancellation charges under your selected rate policy. Any refund is processed separately by hotel staff.', 'Máy chủ tính phí hủy theo gói giá. Nhân viên khách sạn xử lý hoàn tiền riêng.')}
            </p> : <label>
              <span className="field-label">
                {tr('Rating (1–5)', 'Đánh giá (1–5)')}
              </span>
              <input
                className="field-control"
                type="number"
                min={1}
                max={5}
                step={1}
                required
                value={stars}
                onChange={e => setStars(Number(e.target.value))}
              />
            </label>}
            <label>
              <span className="field-label">
                {dialog === 'cancel' ? tr('Reason', 'Lý do') : tr('Review', 'Đánh giá')}
              </span>
              <textarea
                className="field-control min-h-24"
                required
                minLength={dialog === 'cancel' ? 3 : 10}
                maxLength={dialog === 'cancel' ? 300 : 2000}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary"
            >
              {busy ? tr('Processing…', 'Đang xử lý…') : tr('Confirm', 'Xác nhận')}
            </button>
          </form>}
        </section>}
      </div>
      <aside className="self-start border border-line bg-paper p-6">
        <Eyebrow>
          {tr('FIND A RESERVATION', 'TRA CỨU ĐẶT PHÒNG')}
        </Eyebrow>
        <form onSubmit={lookupBooking} className="grid gap-4 mt-5">
          <label>
            <span className="field-label">
              {tr('Booking reference', 'Mã đặt phòng')}
            </span>
            <input
              className="field-control"
              required
              value={lookup.code}
              onChange={e => setLookup(v => ({ ...v, code: e.target.value }))}
            />
          </label>
          <label>
            <span className="field-label">
              {tr('Private lookup key', 'Mã tra cứu riêng')}
            </span>
            <input
              type="password"
              className="field-control"
              minLength={32}
              required
              value={lookup.lookupToken}
              onChange={e => setLookup(v => ({ ...v, lookupToken: e.target.value }))}
            />
          </label>
          <button className="btn-primary" disabled={busy}>
            {tr('FIND BOOKING', 'TRA CỨU')}
          </button>
        </form>
        {!token && <Link href="/account" className="line-link mt-6">
          {tr('Sign in to see your bookings', 'Đăng nhập để xem đặt phòng')}
        </Link>}
      </aside>
    </section>
  </>;
}

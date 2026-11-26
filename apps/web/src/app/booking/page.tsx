'use client';
import { useI18n } from '@/components/language-provider';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { money, prettyDate, photos } from '@/lib/data';
import { getStay, type Stay } from '@/lib/storage';
import { getCustomerAccount, getCustomerToken } from '@/lib/customer-auth';
import { apiRequest, ApiError } from '@/lib/api-client';
import { useRooms, useLiveData, saveGuestAccess, type BookingRecord, type Quote, type Service } from '@/lib/live-data';
import { Photo, PageIntro, Eyebrow, Arrow } from '@/components/ui';
export default function BookingPage() {
  const { locale, t } = useI18n();
  const tr = (en: string, vi: string) => locale === 'vi' ? vi : en;
  const [stay, setStay] = useState<Stay | null>(null);
  const [stage, setStage] = useState(0);
  const [rate, setRate] = useState('FLEXIBLE');
  const [promo, setPromo] = useState('');
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [guest, setGuest] = useState({ guestName: '', guestEmail: '', guestPhone: '', specialRequests: '' });
  const [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [result, setResult] = useState<BookingRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const request = useRef<{
    key: string;
    id: string;
  } | null>(null);
  const catalog = useRooms();
  const services = useLiveData<Service[]>('/services');
  const methods = useLiveData<{
    methods: string[];
  }>('/payments/methods');
  useEffect(() => {
    const s = getStay();
    setStay({ ...s, count: 1 });
    const account = getCustomerAccount();
    if (account)
      setGuest(old => ({ ...old, guestName: account.name, guestEmail: account.email, guestPhone: account.phone }));
  }, []);
  const room = catalog.rooms.find(r => r.id === stay?.room);
  const payload = () => ({
    checkIn: stay!.checkin,
    checkOut: stay!.checkout,
    roomTypeCode: stay!.room,
    adults: stay!.adults,
    children: stay!.children,
    ratePlan: rate,
    ...(promo.trim() ? { promotionCode: promo.trim().toUpperCase() } : {}),
    extras: Object.entries(extras).filter(([, q]) => q > 0).map(([serviceCode, quantity]) => ({ serviceCode, quantity }))
  });
  const getQuote = async () => {
    const { data } = await apiRequest<Quote>('/bookings/quote', { method: 'POST', body: payload(), notifications: 'errors' });
    setQuote(data);
    setAccepted(false);
    setStage(3);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (lock.current || !stay || !room)
      return;
    lock.current = true;
    setBusy(true);
    try {
      if (stage === 2) {
        await getQuote();
        return;
      }
      if (stage !== 3) {
        setStage(s => s + 1);
        return;
      }
      if (!quote || !accepted)
        return;
      const body = {
        ...payload(),
        ...Object.fromEntries(Object.entries(guest).map(([k, v]) => [k, v.trim()])),
        guaranteeMode: 'PAY_AT_HOTEL',
        acceptedTerms: true,
        expectedTotalVnd: quote.totalVnd
      };
      const token = getCustomerToken();
      const bytes = new TextEncoder().encode(JSON.stringify([token ?? null, body]));
      const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
      if (request.current?.key !== key) {
        let saved: string | null = null;
        try {
          saved = sessionStorage.getItem(`dgh-pending-booking-${key}`);
        }
        catch { }
        const id = saved || crypto.randomUUID();
        request.current = { key, id };
        try {
          sessionStorage.setItem(`dgh-pending-booking-${key}`, id);
        }
        catch { }
      }
      const { data } = await apiRequest<BookingRecord>('/bookings', { method: 'POST', body: { ...body, clientRequestId: request.current.id }, token });
      if (data.lookupToken && !token)
        saveGuestAccess({ code: data.code, lookupToken: data.lookupToken });
      try {
        sessionStorage.removeItem(`dgh-pending-booking-${key}`);
      }
      catch { }
      setUncertain(false);
      setResult(data);
    }
    catch (error) {
      if (stage === 3) {
        if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
          setUncertain(true);
        }
        else {
          setUncertain(false);
          if (error instanceof ApiError && error.status === 409) {
            setQuote(null);
            setAccepted(false);
            setStage(2);
          }
        }
      }
    }
    finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (!stay || catalog.loading)
    return <main className="container-site py-24">
      {tr('Loading your stay…', 'Đang tải kỳ nghỉ…')}
    </main>;
  if (catalog.failed || !room)
    return <main className="container-site py-24">
      <p>
        {tr('Room unavailable. Please select an available room.', 'Hạng phòng không khả dụng. Vui lòng chọn lại phòng.')}
      </p>
      <Link className="btn-outline mt-5" href="/availability">
        {tr('Check availability', 'Kiểm tra phòng trống')}
      </Link>
    </main>;
  const stepNames = [tr('Your rate', 'Gói giá'), tr('Personalise', 'Dịch vụ'), tr('Guest details', 'Thông tin khách'), tr('Review & confirm', 'Kiểm tra và xác nhận')];
  const updateGuest = (key: keyof typeof guest, value: string) => setGuest(old => ({ ...old, [key]: value }));
  return <>
    <PageIntro crumb={tr('YOUR RESERVATION', 'ĐẶT PHÒNG')} title={t('Make yourself')} italic={t('at home.')} description={tr('Arrange your stay with confidence.', 'Sắp xếp kỳ nghỉ của bạn.')} />
    <section className="container-site pb-24 grid gap-10 lg:grid-cols-[1fr_370px]">
      <div>
        {result ? <div className="border border-line bg-paper p-8 py-16 text-center">
          <Eyebrow>
            {tr('RESERVATION CONFIRMED', 'ĐẶT PHÒNG ĐÃ XÁC NHẬN')}
          </Eyebrow>
          <h2 className="display mt-6 text-5xl">
            {result.code}
          </h2>
          <p className="body-copy mt-5">
            {tr('Pay at the hotel. No online payment has been taken.', 'Thanh toán tại khách sạn. Chưa thu tiền trực tuyến.')}
          </p>
          <p className="mt-4">
            {money(result.totalVnd)}
          </p>
          {result.lookupToken && <div className="mt-5 text-left">
            <p className="field-label">
              {tr('Private lookup key – save securely', 'Mã tra cứu riêng – lưu an toàn')}
            </p>
            <input readOnly className="field-control" value={result.lookupToken} onFocus={e => e.currentTarget.select()} />
            <p className="body-copy">
              {tr('This key gives access to your booking. Do not share it.', 'Mã này cấp quyền truy cập đặt phòng. Không chia sẻ.')}
            </p>
          </div>}
          <Link href="/reservations" className="btn-primary mt-8">
            {tr('VIEW RESERVATION', 'XEM ĐẶT PHÒNG')}
            <Arrow />
          </Link>
        </div> : <form onSubmit={submit}>
          <div className="mb-10 grid grid-cols-4 gap-2 border-b border-line pb-6">
            {stepNames.map((s, i) => <div className={`border-t-2 pt-3 ${i <= stage ? 'border-gold' : 'border-line'}`} key={s}>
              <small>0{i + 1}</small>
              <p className="text-xs">
                {s}
              </p>
            </div>)}
          </div>
          {stage === 0 && <>
            <Eyebrow>
              {tr('01 / YOUR RATE', '01 / GÓI GIÁ')}
            </Eyebrow>
            <h2 className="font-display mt-5 text-5xl">
              {tr('Choose your rate.', 'Chọn gói giá.')}
            </h2>
            <div className="mt-7 grid gap-4">
              {[['FLEXIBLE', tr('Flexible', 'Linh hoạt'), tr('Free cancellation until 48 hours before check-in; then up to one night.', 'Miễn phí hủy đến 48 giờ trước giờ nhận phòng; sau đó phí tối đa một đêm.')], ['NON_REFUNDABLE', tr('Non-refundable', 'Không hoàn tiền'), tr('10% lower room rate; full room charge on cancellation.', 'Giảm 10% giá phòng; tính toàn bộ tiền phòng khi hủy.')]].map(([id, name, desc]) => <label className={`flex gap-4 border p-6 ${rate === id ? 'border-gold bg-surface-alt' : 'border-line bg-paper'}`} key={id}>
                <input type="radio" name="rate" value={id} checked={rate === id} onChange={() => setRate(id)} className="accent-gold" />
                <span>
                  <strong className="font-display text-3xl">
                    {name}
                  </strong>
                  <span className="body-copy block mt-2">
                    {desc}
                  </span>
                </span>
              </label>)}
            </div>
          </>}
          {stage === 1 && <>
            <Eyebrow>
              {tr('02 / PERSONALISE YOUR STAY', '02 / DỊCH VỤ')}
            </Eyebrow>
            <h2 className="font-display mt-5 text-5xl">
              {tr('A little extra.', 'Thêm trải nghiệm.')}
            </h2>
            {services.loading ? <p>
              {tr('Loading services…', 'Đang tải dịch vụ…')}
            </p> : services.failed ? <button type="button" className="btn-outline" onClick={services.reload}>
              {tr('Retry loading services', 'Tải lại dịch vụ')}
            </button> : <div className="mt-6 grid gap-4">
              {(services.data ?? []).map(s => <label key={s.code} className="flex gap-5 items-center justify-between border border-line bg-paper p-5">
                <span>
                  <strong className="font-display text-3xl">
                    {(locale === 'vi' ? s.nameVi : null) || s.name}
                  </strong>
                  <span className="body-copy block">{money(s.priceVnd)} / {(locale === 'vi' ? s.unitVi : null) || s.unit}</span>
                </span>
                <input aria-label={(locale === 'vi' ? s.nameVi : null) || s.name} type="number" min={0} max={30} step={1} className="field-control max-w-24" value={extras[s.code] ?? 0} onChange={e => setExtras(v => ({ ...v, [s.code]: Number(e.target.value) }))} />
              </label>)}
            </div>}
            <label className="block mt-7">
              <span className="field-label">
                {tr('PROMOTION CODE (OPTIONAL)', 'MÃ ƯU ĐÃI (TÙY CHỌN)')}
              </span>
              <input className="field-control" maxLength={32} value={promo} onChange={e => setPromo(e.target.value)} />
            </label>
          </>}
          {stage === 2 && <>
            <Eyebrow>
              {tr('03 / GUEST DETAILS', '03 / THÔNG TIN KHÁCH')}
            </Eyebrow>
            <h2 className="font-display mt-5 text-5xl">
              {tr('Who is joining us?', 'Ai sẽ lưu trú?')}
            </h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {([['guestName', tr('FULL NAME', 'HỌ VÀ TÊN'), 'text', 120], ['guestEmail', tr('EMAIL', 'EMAIL'), 'email', 180], ['guestPhone', tr('PHONE', 'ĐIỆN THOẠI'), 'tel', 32]] as const).map(([key, label, type, max]) => <label key={key}>
                <span className="field-label">
                  {label}
                </span>
                <input className="field-control" type={type} maxLength={max} required={key !== 'guestPhone'} value={guest[key]} onChange={e => updateGuest(key, e.target.value)} />
              </label>)}
              <label className="md:col-span-2">
                <span className="field-label">
                  {tr('SPECIAL REQUESTS', 'YÊU CẦU ĐẶC BIỆT')}
                </span>
                <textarea className="field-control min-h-24" maxLength={500} value={guest.specialRequests} onChange={e => updateGuest('specialRequests', e.target.value)} />
              </label>
            </div>
          </>}
          {stage === 3 && quote && <>
            <Eyebrow>
              {tr('04 / REVIEW YOUR STAY', '04 / KIỂM TRA ĐẶT PHÒNG')}
            </Eyebrow>
            <h2 className="font-display mt-5 text-5xl">
              {tr('Almost there.', 'Sắp hoàn tất.')}
            </h2>
            <div className="my-7 border border-line bg-paper p-6 grid gap-4 text-sm">
              <strong>
                {guest.guestName}
              </strong>
              <span>
                {guest.guestEmail}
              </span>
              <span>
                {room.name}
              </span>
              <span>
                {rate === 'FLEXIBLE' ? tr('Flexible', 'Linh hoạt') : tr('Non-refundable', 'Không hoàn tiền')}
              </span>
              <span>
                {tr('Pay at the hotel', 'Thanh toán tại khách sạn')}
              </span>
              <strong>{tr('Total', 'Tổng tiền')}: {money(quote.totalVnd)}</strong>
            </div>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} className="accent-gold" />
              {tr('I accept the selected cancellation policy and agree to pay at the hotel.', 'Tôi đồng ý chính sách hủy đã chọn và thanh toán tại khách sạn.')}
            </label>
            {uncertain && <p role="alert" className="mt-4">
              {tr('The request may have reached the server. Retry this same reservation without changing its details.', 'Yêu cầu có thể đã tới máy chủ. Hãy thử lại đúng đặt phòng này, không thay đổi thông tin.')}
            </p>}
          </>}
          <div className="mt-10 flex justify-between gap-4 border-t border-line pt-7">
            {stage > 0 ? <button type="button" disabled={busy || uncertain} className="btn-outline" onClick={() => {
              setStage(s => s - 1);
              setQuote(null);
              setAccepted(false);
            }}>
              {tr('PREVIOUS', 'QUAY LẠI')}
            </button> : <Link className="btn-outline" href="/availability">
              {tr('BACK TO ROOMS', 'QUAY LẠI PHÒNG')}
            </Link>}
            <button className="btn-primary" type="submit" disabled={busy || (stage === 3 && (!accepted || !methods.data?.methods.includes('PAY_AT_HOTEL')))}>
              {busy ? tr('PROCESSING…', 'ĐANG XỬ LÝ…') : stage === 3 ? tr('CONFIRM RESERVATION', 'XÁC NHẬN ĐẶT PHÒNG') : stage === 2 ? tr('GET QUOTE', 'LẤY BÁO GIÁ') : tr('CONTINUE', 'TIẾP TỤC')}
              <Arrow />
            </button>
          </div>
          {methods.failed && <button type="button" className="btn-outline mt-3" onClick={methods.reload}>
            {tr('Retry loading payment methods', 'Tải lại phương thức thanh toán')}
          </button>}
        </form>}
      </div>
      <aside className="self-start border border-line bg-paper lg:sticky lg:top-32">
        <Photo src={room.images[0] || photos.interior} alt={room.name} className="aspect-[16/10]" />
        <div className="p-6">
          <Eyebrow>
            {tr('YOUR RESERVATION', 'ĐẶT PHÒNG CỦA BẠN')}
          </Eyebrow>
          <h3 className="font-display text-4xl mt-3">
            {room.name}
          </h3>
          <p className="body-copy mt-4">{prettyDate(stay.checkin, locale)} — {prettyDate(stay.checkout, locale)}</p>
          <p className="body-copy">{stay.adults} {tr('adults', 'người lớn')} · {stay.children} {tr('children', 'trẻ em')} · 1 {tr('room', 'phòng')}</p>
          {(result || quote) && <div className="mt-6 grid gap-3 border-t border-line pt-4 text-sm">
            {[
              [tr('Accommodation', 'Tiền phòng'), (result || quote)!.roomTotalVnd],
              [tr('Promotion discount', 'Giảm giá'), -(result || quote)!.discountVnd],
              [tr('Extras', 'Dịch vụ'), (result || quote)!.extraTotalVnd],
              [tr('Total', 'Tổng'), (result || quote)!.totalVnd]
            ].map(([label, v]) => <div className="flex justify-between" key={label}>
              <span>
                {label}
              </span>
              <strong>
                {money(Number(v))}
              </strong>
            </div>)}
          </div>}
          {!quote && !result && <p className="body-copy mt-5">
            {tr('Final rates and availability will be calculated by the server before confirmation.', 'Máy chủ sẽ tính giá cuối cùng và kiểm tra phòng trống trước khi xác nhận.')}
          </p>}
        </div>
      </aside>
    </section>
  </>;
}

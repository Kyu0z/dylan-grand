'use client';
import { useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/language-provider';
import { SelectField } from '@/components/form-controls';
import { Photo, PageIntro, Eyebrow, SectionTitle, Arrow } from '@/components/ui';
import { photos, money, prettyDate } from '@/lib/data';
import { apiRequest } from '@/lib/api-client';
import { useLiveData, useRooms, useWishlist, type Service, type Review } from '@/lib/live-data';
export default function ExperiencesPage() {
  const { locale } = useI18n();
  const tr = (en: string, vi: string) => locale === 'vi' ? vi : en;
  const services = useLiveData<Service[]>('/services');
  const reviews = useLiveData<Review[]>('/reviews');
  const { rooms } = useRooms();
  const wish = useWishlist();
  const [contact, setContact] = useState({ name: '', email: '', topic: 'General enquiry', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current)
      return;
    lock.current = true;
    setBusy(true);
    setSent(false);
    try {
      await apiRequest('/contact', { method: 'POST', body: contact });
      setSent(true);
      setContact({ name: '', email: '', topic: 'General enquiry', message: '' });
    }
    catch { /* API client shows the error */ }
    finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function state(d: {
    loading: boolean;
    failed: boolean;
    reload: () => void;
  }, empty: boolean) {
    return d.loading ? <p>
      {tr('Loading…', 'Đang tải…')}
    </p> : d.failed ? <button className="btn-outline" onClick={d.reload}>
      {tr('Unable to load. Retry', 'Không tải được. Thử lại')}
    </button> : empty ? <p className="body-copy">
      {tr('No items available.', 'Chưa có dữ liệu.')}
    </p> : null;
  }
  return <>
    <PageIntro crumb={tr('EXPERIENCES & SERVICES', 'TRẢI NGHIỆM & DỊCH VỤ')} title={tr('Stay a little', 'Tận hưởng')} italic={tr('longer.', 'thêm một chút.')} description={tr('Discover our hotel services and plan your stay.', 'Khám phá dịch vụ khách sạn và lên kế hoạch lưu trú.')} />
    <section className="grid lg:grid-cols-[55%_45%]">
      <Photo src={photos.pool} alt={tr('Hotel pool', 'Hồ bơi khách sạn')} className="min-h-[390px]" />
      <div className="flex flex-col justify-center bg-forest p-9 text-surface md:p-17">
        <Eyebrow light>
          {tr('AN INVITATION TO SLOW DOWN', 'LỜI MỜI SỐNG CHẬM')}
        </Eyebrow>
        <h2 className="display mt-7 text-6xl">
          {tr('Made for', 'Dành cho')}
          <em>
            {tr('the moment.', 'từng khoảnh khắc.')}
          </em>
        </h2>
      </div>
    </section>
    <section id="services" className="container-site section-pad">
      <SectionTitle index={tr('01 / EXPERIENCES', '01 / TRẢI NGHIỆM')} title={tr('A little space to', 'Không gian để')} italic={tr('simply be.', 'tận hưởng.')} />
      {state(services, !services.data?.length)}
      <div className="grid gap-8 md:grid-cols-2">
        {(services.data ?? []).map((s, index) => {
          const name = (locale === 'vi' ? s.nameVi : null) || s.name;
          const unit = (locale === 'vi' ? s.unitVi : null) || s.unit;
          const subtitle = (locale === 'vi' ? s.eyebrowVi || s.eyebrowEn : s.eyebrowEn || s.eyebrowVi) || tr('HOTEL EXPERIENCE', 'TRẢI NGHIỆM KHÁCH SẠN');
          const description = locale === 'vi' ? s.descriptionVi || s.descriptionEn : s.descriptionEn || s.descriptionVi;
          return <article key={s.code} className="group flex h-full min-w-0 flex-col overflow-hidden border border-line bg-paper">
            {s.imageUrl ? <Photo src={s.imageUrl} alt={name} className="aspect-[3/2]" /> : <div className="grid aspect-[3/2] place-items-center bg-surface-alt px-6 text-center">
              <span className="eyebrow text-muted">{name}</span>
            </div>}
            <div className="flex flex-1 flex-col p-6 md:p-8">
              <Eyebrow>{String(index + 1).padStart(2, '0')} / {subtitle}</Eyebrow>
              <h3 className="font-display mt-4 break-words text-4xl leading-tight">{name}</h3>
              {description && <p className="body-copy mt-3 whitespace-pre-wrap break-words">{description}</p>}
              <div className="mt-auto pt-12">
                <div className="flex flex-wrap items-end justify-between gap-5 border-t border-line pt-6">
                  <div className="min-w-0">
                    <Eyebrow>{tr('FROM', 'TỪ')}</Eyebrow>
                    <strong className="mt-2 block text-base font-medium">{money(s.priceVnd)}</strong>
                    <span className="mt-1 block break-words text-xs leading-relaxed text-muted">{unit}</span>
                  </div>
                  <Link href="/availability" className="btn-outline">
                    {tr('ADD TO STAY', 'THÊM VÀO KỲ NGHỈ')} <Arrow diagonal />
                  </Link>
                </div>
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <SectionTitle index={tr('02 / GUEST REVIEWS', '02 / ĐÁNH GIÁ')} title={tr('Thoughts from', 'Cảm nhận từ')} italic={tr('our guests.', 'khách lưu trú.')} />
        {state(reviews, !reviews.data?.length)}
        <div className="grid gap-6 md:grid-cols-2">
          {(reviews.data ?? []).map(r => <article key={r.id} className="border border-line p-6">
            <Eyebrow>{r.stars}/5 ★</Eyebrow>
            <p className="body-copy mt-4 whitespace-pre-wrap">
              {r.comment}
            </p>
            <p className="text-xs text-muted mt-3">
              {prettyDate(r.createdAt.slice(0, 10), locale)}
            </p>
            {r.response && <div className="mt-4 border-t border-line pt-4">
              <strong>
                {tr('Hotel response', 'Phản hồi khách sạn')}
              </strong>
              <p className="body-copy whitespace-pre-wrap">
                {r.response}
              </p>
            </div>}
          </article>)}
        </div>
        <Link href="/reservations" className="line-link mt-7">
          {tr('REVIEW YOUR COMPLETED STAY', 'ĐÁNH GIÁ KỲ NGHỈ ĐÃ HOÀN TẤT')}
          <Arrow />
        </Link>
      </div>
    </section>
    <section className="container-site section-pad">
      <SectionTitle index={tr('03 / YOUR SAVED ROOMS', '03 / PHÒNG ĐÃ LƯU')} title={tr('Spaces to', 'Không gian')} italic={tr('remember.', 'đáng nhớ.')} />
      <div className="grid gap-8 md:grid-cols-3">
        {rooms.filter(r => wish.codes.includes(r.id)).map(r => <Link key={r.id} href={`/rooms?room=${encodeURIComponent(r.id)}`}>
          <Photo src={r.images[0]} alt={r.name} className="aspect-[4/3]" />
          <h3 className="font-display mt-5 text-3xl">
            {r.name}
          </h3>
        </Link>)}
      </div>
      <Link href="/rooms" className="line-link mt-5">
        {tr('EXPLORE ROOMS', 'KHÁM PHÁ PHÒNG')}
        <Arrow />
      </Link>
    </section>
    <section id="contact" className="section-pad bg-paper">
      <div className="container-site grid gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>
            {tr("04 / LET'S CONNECT", '04 / LIÊN HỆ')}
          </Eyebrow>
          <h2 className="section-heading mt-6">
            {tr("We'd love to", 'Chúng tôi mong')}
            <em>
              {tr('hear from you.', 'được lắng nghe.')}
            </em>
          </h2>
          <Photo src={photos.lobby} alt={tr('Hotel reception', 'Lễ tân khách sạn')} className="mt-10 aspect-[16/9]" />
        </div>
        <form className="grid content-start gap-5" onSubmit={submit}>
          <label>
            <span className="field-label">
              {tr('YOUR NAME', 'HỌ TÊN')}
            </span>
            <input className="field-control" required maxLength={120} value={contact.name} onChange={e => setContact(v => ({ ...v, name: e.target.value }))} />
          </label>
          <label>
            <span className="field-label">EMAIL</span>
            <input className="field-control" required type="email" maxLength={180} value={contact.email} onChange={e => setContact(v => ({ ...v, email: e.target.value }))} />
          </label>
          <SelectField label={tr('SUBJECT', 'CHỦ ĐỀ')} value={contact.topic} options={[{ value: 'General enquiry', label: tr('General enquiry', 'Câu hỏi chung') }, { value: 'Reservation enquiry', label: tr('Reservation enquiry', 'Đặt phòng') }, { value: 'Experiences', label: tr('Experiences', 'Trải nghiệm') }]} onValueChange={topic => setContact(v => ({ ...v, topic }))} />
          <label>
            <span className="field-label">
              {tr('MESSAGE', 'NỘI DUNG')}
            </span>
            <textarea className="field-control min-h-40" required minLength={10} maxLength={2000} value={contact.message} onChange={e => setContact(v => ({ ...v, message: e.target.value }))} />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? tr('Sending…', 'Đang gửi…') : tr('SEND ENQUIRY', 'GỬI LIÊN HỆ')}
            <Arrow />
          </button>
          {sent && <p role="status">
            {tr('Your enquiry has been recorded for hotel staff.', 'Yêu cầu của bạn đã được ghi nhận để nhân viên xử lý.')}
          </p>}
        </form>
      </div>
    </section>
  </>;
}

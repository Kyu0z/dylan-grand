'use client';
import { T, useI18n } from '@/components/language-provider';
import { DateField, SelectField } from '@/components/form-controls';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { money, nights, dayISO, addDays, type RoomId } from '@/lib/data';
import { useRooms, useLiveData, type Availability } from '@/lib/live-data';
import { getStay, saveStay } from '@/lib/storage';
import { PageIntro, Photo, Eyebrow, Arrow } from '@/components/ui';
function AvailabilityContent() {
  const { t } = useI18n();
  const catalog = useRooms();
  const rooms = catalog.rooms;
  const router = useRouter(), params = useSearchParams();
  const [ready, setReady] = useState(false),
    [checkin, setCheckin] = useState(addDays(dayISO(), 14)),
    [checkout, setCheckout] = useState(addDays(dayISO(), 17)),
    [adults, setAdults] = useState(2),
    [children, setChildren] = useState(0),
    [maxPrice, setMaxPrice] = useState(2000000000),
    [sort, setSort] = useState('recommended'),
    [amenities, setAmenities] = useState<string[]>([]),
    [selected, setSelected] = useState<RoomId | ''>(''),
    [error, setError] = useState('');
  useEffect(() => {
    const s = getStay();
    setCheckin(s.checkin);
    setCheckout(s.checkout);
    setAdults(s.adults);
    setChildren(s.children);
    const id = params.get('room');
    if (id) setSelected(id);
    setReady(true);
  }, [params]);
  const valid = checkout > checkin && checkin >= dayISO() && nights(checkin, checkout) <= 30;
  const d = useLiveData<Availability>(ready && valid ? `/availability?${new URLSearchParams({ checkIn: checkin, checkOut: checkout, adults: String(adults), children: String(children) })}` : null);
  const count = 1;
  const available = rooms.flatMap(r => { const a = d.data?.roomTypes.find(x => x.roomTypeCode === r.id); return a ? [{ ...r, available: a.availableRooms, price: a.totalRoomPriceVnd / a.nights, total: a.totalRoomPriceVnd }] : []; }).filter(r => r.guests >= adults + children && r.available >= count && r.price <= maxPrice && (!selected || r.id === selected) && amenities.every(a => r.amenities.some(x => x.toLowerCase().includes(a)))).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : a.size - b.size);
  const go = (id: RoomId) => {
    if (!valid) {
      setError('Please select valid stay dates.');
      return;
    }
    saveStay({ checkin, checkout, adults, children, count: 1, room: id, rate: 'flexible', promo: '' });
    router.push('/booking');
  };
  return <>
    <PageIntro crumb={t("CHECK AVAILABILITY")}
      title={t("Your time to")}
      italic={t("unwind.")}
      description={t("Tell us when you'd like to stay. Explore spaces that fit your plans.")}
    />
    <section className="container-site pb-24">
      <div className="grid gap-10 lg:grid-cols-[315px_1fr]">
        <aside className="self-start border border-line bg-paper p-6 lg:sticky lg:top-32">
          <Eyebrow><T>{"REFINE YOUR STAY"}</T></Eyebrow>
          <h2 className="font-display mt-3 text-4xl"><T>{"The perfect fit."}</T></h2>
          <div className="mt-7 grid gap-5">
            <DateField label={t("CHECK-IN")}
              value={checkin}
              onValueChange={(date) => setCheckin(date)}
              minDate={dayISO()}
            />
            <DateField label={t("CHECK-OUT")}
              value={checkout}
              onValueChange={(date) => setCheckout(date)}
              minDate={addDays(checkin, 1)}
            />
            <SelectField label={t("ADULT GUESTS")}
              value={String(adults)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'adult' : 'adults'}` }))}
              onValueChange={(value) => setAdults(Number(value))}
            />
            <SelectField label={t("CHILDREN")}
              value={String(children)}
              options={[0, 1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: String(n) }))}
              onValueChange={value => setChildren(Number(value))}
            />
            <SelectField label={t("ROOM TYPE")}
              value={String(selected)}
              options={[{ value: '', label: 'All rooms' }, ...rooms.map((room) => ({ value: room.id, label: t(room.name) }))]}
              onValueChange={(value) => setSelected(value as RoomId | '')}
            />
            <div>
              <label className="field-label" htmlFor="max-price"><T>{"MAXIMUM RATE / NIGHT"}</T></label>
              <input id="max-price"
                type="range"
                min={0}
                max={Math.max(5500000, ...rooms.map(r => r.price))}
                step={250000}
                value={Math.min(maxPrice, Math.max(5500000, ...rooms.map(r => r.price)))}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-gold"
              />
              <strong className="text-sm">
                {money(Math.min(maxPrice, Math.max(5500000, ...rooms.map(r => r.price))))}
              </strong>
            </div>
            <fieldset className="border-t border-line pt-5">
              <legend className="field-label"><T>{"IN-ROOM FEATURES"}</T></legend>
              {[['wifi', 'Wi-Fi'], ['bath', 'Bath / shower'], ['lounge', 'Lounge area']].map(([v, l]) => <label className="my-3 flex gap-3 text-xs" key={v}>
                <input type="checkbox"
                  className="accent-gold"
                  checked={amenities.includes(v)}
                  onChange={e => setAmenities(s => e.target.checked ? [...s, v] : s.filter(x => x !== v))}
                />
                {t(l)}
              </label>)}
            </fieldset>
            <button className="btn-outline"
              onClick={() => {
                setMaxPrice(2000000000);
                setSelected('');
                setAmenities([]);
                setAdults(2);
                setChildren(0);
              }}
            ><T>{"RESET FILTERS"}</T></button>
          </div>
        </aside>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <Eyebrow><T>{"OUR AVAILABILITY"}</T></Eyebrow>
              <p className="mt-2 text-sm">{ready && !d.loading && !catalog.loading ? available.length : '—'} <T>{"options ·"}</T>{" "}{valid ? nights(checkin, checkout) : 0} <T>{"nights"}</T></p>
            </div>
            <SelectField label={t("SORT BY")}
              value={String(sort)}
              options={[{ value: 'recommended', label: 'Recommended' }, { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' }]}
              onValueChange={(value) => setSort(value)}
            />
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">
            {t(error)}
          </p>}
          {!valid && <p className="mt-6 bg-surface-alt p-4 text-sm"><T>{"Check-out must be later than check-in, and check-in cannot be in the past."}</T></p>}
          {valid && !catalog.failed && !d.failed && available.map(room => <article key={room.id}
            className="my-7 grid overflow-hidden border border-line bg-paper md:grid-cols-[43%_57%]"
          >
            <Photo src={room.images[0]} alt={`${t(room.name)} guest bedroom`} className="min-h-[280px]" />
            <div className="flex flex-col p-7">
              <Eyebrow>{t(room.subtitle)} {room.size > 0 && <>/ {room.size} <T>{"M²"}</T></>}</Eyebrow>
              <h2 className="font-display mt-4 text-5xl">
                {t(room.name)}
              </h2>
              <p className="body-copy mt-4">
                {t(room.description)}
              </p>
              <p className="mt-4 text-xs text-muted">{t(room.beds)} <T>{"· Up to"}</T>{" "}{room.guests} <T>{"guests ·"}</T>{" "}{t(room.view)}</p>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
                <div>
                  <span className="field-label"><T>{"ESTIMATED TOTAL"}</T></span>
                  <strong className="text-lg">
                    {money(room.total)}
                  </strong>
                  <p className="mt-1 text-[11px] text-muted">{money(room.price)} <T>{"/ night · available rooms:"}</T>{" "}{room.available}</p>
                </div>
                <button className="btn-primary" onClick={() => go(room.id)}><T>{"CHOOSE ROOM"}</T>{" "}<Arrow /></button>
              </div>
            </div>
          </article>)}
          {(d.loading || catalog.loading) && valid && <p className="py-6">{t("Checking availability…")}</p>}
          {(d.failed || catalog.failed) && <button className="btn-outline mt-6" onClick={() => { d.reload(); catalog.reload(); }}>{t("Unable to load availability. Retry")}</button>}
          {valid && !d.loading && !catalog.loading && !d.failed && !catalog.failed && !available.length && <div className="py-24 text-center">
            <h2 className="font-display text-5xl"><T>{"No rooms in this selection."}</T></h2>
            <p className="body-copy mt-5"><T>{"Try a different room type, price range or guest count."}</T></p>
          </div>}
        </div>
      </div>
    </section>
  </>;
}
export default function AvailabilityPage() {
  return <Suspense fallback={<div className="container-site py-24"><T>{"Preparing your stay…"}</T></div>}>
    <AvailabilityContent />
  </Suspense>;
}

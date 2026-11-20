'use client';
import { DateField, SelectField } from '@/components/form-controls';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { rooms, money, nights, dayISO, addDays, type RoomId } from '@/lib/data';
import { getStay, saveStay } from '@/lib/storage';
import { PageIntro, Photo, Eyebrow, Arrow, InfoNote } from '@/components/ui';
function AvailabilityContent() {
  const router = useRouter(), params = useSearchParams();
  const [ready, setReady] = useState(false),
    [checkin, setCheckin] = useState(addDays(dayISO(), 14)),
    [checkout, setCheckout] = useState(addDays(dayISO(), 17)),
    [adults, setAdults] = useState(2),
    [count, setCount] = useState(1),
    [maxPrice, setMaxPrice] = useState(5500000),
    [sort, setSort] = useState('recommended'),
    [amenities, setAmenities] = useState<string[]>([]),
    [selected, setSelected] = useState<RoomId | ''>(''),
    [error, setError] = useState('');
  useEffect(() => {
    const s = getStay();
    setCheckin(s.checkin);
    setCheckout(s.checkout);
    setAdults(s.adults);
    setCount(s.count);
    const id = params.get('room');
    if (id && rooms.some(r => r.id === id)) setSelected(id as RoomId);
    setReady(true);
  }, [params]);
  const valid = checkout > checkin && checkin >= dayISO();
  const available = rooms.filter(r => r.guests >= Math.ceil(adults / count) && r.available >= count && r.price <= maxPrice && (!selected || r.id === selected) && amenities.every(a => r.amenities.some(x => x.toLowerCase().includes(a)))).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : a.size - b.size);
  const go = (id: RoomId) => {
    if (!valid) {
      setError('Please select valid stay dates.');
      return;
    }
    saveStay({ checkin, checkout, adults, count, room: id });
    router.push('/booking');
  };
  return <>
    <PageIntro crumb="CHECK AVAILABILITY"
      title="Your time to"
      italic="unwind."
      description="Tell us when you'd like to stay. Explore spaces that fit your plans, with transparent sample rates."
    />
    <section className="container-site pb-24">
      <div className="grid gap-10 lg:grid-cols-[315px_1fr]">
        <aside className="self-start border border-line bg-paper p-6 lg:sticky lg:top-32">
          <Eyebrow>REFINE YOUR STAY</Eyebrow>
          <h2 className="font-display mt-3 text-4xl">The perfect fit.</h2>
          <div className="mt-7 grid gap-5">
            <DateField label="CHECK-IN"
              value={checkin}
              onValueChange={(date) => setCheckin(date)}
              minDate={dayISO()}
            />
            <DateField label="CHECK-OUT"
              value={checkout}
              onValueChange={(date) => setCheckout(date)}
              minDate={addDays(checkin, 1)}
            />
            <SelectField label="ADULT GUESTS"
              value={String(adults)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'adult' : 'adults'}` }))}
              onValueChange={(value) => setAdults(Number(value))}
            />
            <SelectField label="NUMBER OF ROOMS"
              value={String(count)}
              options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'room' : 'rooms'}` }))}
              onValueChange={(value) => setCount(Number(value))}
            />
            <SelectField label="ROOM TYPE"
              value={String(selected)}
              options={[{ value: '', label: 'All rooms' }, ...rooms.map((room) => ({ value: room.id, label: room.name }))]}
              onValueChange={(value) => setSelected(value as RoomId | '')}
            />
            <div>
              <label className="field-label" htmlFor="max-price">MAXIMUM RATE / NIGHT</label>
              <input id="max-price"
                type="range"
                min={2000000}
                max={5500000}
                step={250000}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-gold"
              />
              <strong className="text-sm">
                {money(maxPrice)}
              </strong>
            </div>
            <fieldset className="border-t border-line pt-5">
              <legend className="field-label">IN-ROOM FEATURES</legend>
              {[['wifi', 'Wi-Fi'], ['bath', 'Bath / shower'], ['lounge', 'Lounge area']].map(([v, l]) => <label className="my-3 flex gap-3 text-xs" key={v}>
                <input type="checkbox"
                  className="accent-gold"
                  checked={amenities.includes(v)}
                  onChange={e => setAmenities(s => e.target.checked ? [...s, v] : s.filter(x => x !== v))}
                />
                {l}
              </label>)}
            </fieldset>
            <button className="btn-outline"
              onClick={() => {
                setMaxPrice(5500000);
                setSelected('');
                setAmenities([]);
                setAdults(2);
                setCount(1);
              }}
            >RESET FILTERS</button>
          </div>
        </aside>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <Eyebrow>OUR AVAILABILITY</Eyebrow>
              <p className="mt-2 text-sm">{ready ? available.length : '—'} options · {valid ? nights(checkin, checkout) : 0} nights</p>
            </div>
            <SelectField label="SORT BY"
              value={String(sort)}
              options={[{ value: 'recommended', label: 'Recommended' }, { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' }]}
              onValueChange={(value) => setSort(value)}
            />
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>}
          {!valid && <p className="mt-6 bg-surface-alt p-4 text-sm">Check-out must be later than check-in, and check-in cannot be in the past.</p>}
          {valid && available.map(room => <article key={room.id}
            className="my-7 grid overflow-hidden border border-line bg-paper md:grid-cols-[43%_57%]"
          >
            <Photo src={room.images[0]} alt={`${room.name} guest bedroom`} className="min-h-[280px]" />
            <div className="flex flex-col p-7">
              <Eyebrow>{room.subtitle} / {room.size} M²</Eyebrow>
              <h2 className="font-display mt-4 text-5xl">
                {room.name}
              </h2>
              <p className="body-copy mt-4">
                {room.description}
              </p>
              <p className="mt-4 text-xs text-muted">{room.beds} · Up to {room.guests} guests · {room.view}</p>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
                <div>
                  <span className="field-label">ESTIMATED TOTAL</span>
                  <strong className="text-lg">
                    {money(room.price * nights(checkin, checkout) * count)}
                  </strong>
                  <p className="mt-1 text-[11px] text-muted">{money(room.price)} / night · sample inventory: {room.available}</p>
                </div>
                <button className="btn-primary" onClick={() => go(room.id)}>CHOOSE ROOM <Arrow /></button>
              </div>
            </div>
          </article>)}
          {valid && !available.length && <div className="py-24 text-center">
            <h2 className="font-display text-5xl">No rooms in this selection.</h2>
            <p className="body-copy mt-5">Try a different room type, price range or guest count.</p>
          </div>}
        </div>
      </div>
    </section>
    <div className="container-site pb-12">
      <InfoNote>This availability calendar is illustrative. Prices and inventory are static sample values, not an active hotel inventory system.</InfoNote>
    </div>
  </>;
}
export default function AvailabilityPage() {
  return <Suspense fallback={<div className="container-site py-24">Preparing your stay…</div>}>
    <AvailabilityContent />
  </Suspense>;
}

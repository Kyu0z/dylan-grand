'use client';
import { SelectField } from '@/components/form-controls';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { rooms, money, type Room, type RoomId } from '@/lib/data';
import { Photo, PageIntro, Eyebrow, RoomCard, RoomDetail, Arrow, InfoNote } from '@/components/ui';
import { Suspense } from 'react';
function RoomsContent() {
  const params = useSearchParams();
  const [selected, setSelected] = useState<Room | null>(null),
    [compare, setCompare] = useState<RoomId[]>([]),
    [compareOpen, setCompareOpen] = useState(false),
    [minGuests, setMinGuests] = useState(1),
    [view, setView] = useState('all');
  useEffect(() => {
    const r = rooms.find(r => r.id === params.get('room'));
    if (r) setSelected(r);
  }, [params]);
  const toggle = (id: RoomId) => setCompare(s => s.includes(id) ? s.filter(x => x !== id) : s.length >= 3 ? s : [...s, id]);
  const close = useCallback(() => setSelected(null), []);
  const filtered = rooms.filter(r => r.guests >= minGuests && (view === 'all' || r.view.toLowerCase().includes(view)));
  return <><PageIntro crumb="ROOMS & SUITES"
    title="Rooms for"
    italic="every rhythm."
    description="Intimate, thoughtfully detailed and wonderfully unhurried. Find a space that feels just right for your stay."
  /><div className="grid lg:grid-cols-[58%_42%]">
      <Photo src={rooms[2].images[0]}
        alt="Grand Suite hotel bedroom"
        className="min-h-[360px] lg:min-h-[490px]"
      />
      <div className="flex flex-col justify-center bg-forest p-9 text-surface lg:p-20">
        <Eyebrow light>A ROOM OF YOUR OWN</Eyebrow>
        <h2 className="display mt-7 text-6xl">Made for<br /><em>staying in.</em></h2>
        <p className="mt-7 max-w-sm text-sm leading-8 text-surface/75">Warm textures, quiet corners and considered amenities bring the Dylan Grand experience into every room.</p>
        <a className="line-link mt-9 w-fit" href="#room-collection">EXPLORE THE COLLECTION <Arrow /></a>
      </div>
    </div><section className="section-pad container-site" id="room-collection">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>02 / OUR ACCOMMODATIONS</Eyebrow>
          <h2 className="section-heading mt-5">Discover your <em>space.</em></h2>
        </div>
        <span className="text-xs text-muted">{filtered.length} ROOM TYPES</span>
      </div>
      <div className="mb-10 flex flex-wrap items-end gap-4 border-y border-line py-5">
        <SelectField label="GUESTS"
          value={String(minGuests)}
          options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n}+ guests` }))}
          onValueChange={(value) => setMinGuests(Number(value))}
        />
        <SelectField label="VIEW"
          value={String(view)}
          options={[{ value: 'all', label: 'All views' }, { value: 'city', label: 'City' }, { value: 'garden', label: 'Garden' }, { value: 'panoramic', label: 'Panoramic' }]}
          onValueChange={(value) => setView(value)}
        />
        <button className="btn-outline mt-5" onClick={() => {
          setMinGuests(1);
          setView('all');
        }}>RESET FILTERS</button>
      </div>
      <div className="grid gap-9 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(room => <div key={room.id}>
          <RoomCard room={room} />
          <div className="mt-3 flex items-center justify-between">
            <button className="text-xs font-semibold underline underline-offset-4"
              onClick={() => setSelected(room)}
            >VIEW ROOM GALLERY</button>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox"
              checked={compare.includes(room.id)}
              onChange={() => toggle(room.id)}
              className="accent-gold"
            />Compare</label>
          </div>
        </div>)}
      </div>
      {!filtered.length && <p className="body-copy py-20 text-center">No rooms match these filters.</p>}
      {compare.length > 0 && <div className="sticky bottom-5 z-20 mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-3 border border-gold bg-paper p-4 shadow-xl">
        <span className="text-xs">{compare.length} room{compare.length > 1 ? 's' : ''} selected</span>
        <button className="btn-primary" onClick={() => setCompareOpen(true)}>COMPARE ROOMS →</button>
        <button className="text-xs" onClick={() => setCompare([])}>Clear</button>
      </div>}
      <div className="mt-20 border-t border-line pt-14 text-center">
        <h3 className="font-display text-5xl">Unwind, then stay awhile.</h3>
        <p className="body-copy mx-auto mt-5 max-w-lg">Every stay is personal. Explore availability and discover the room that feels right.</p>
        <Link href="/availability" className="btn-primary mt-8">CHECK AVAILABILITY <Arrow /></Link>
      </div>
    </section>{selected && <RoomDetail room={selected} onClose={close} />} {compareOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-overlay p-4">
      <section role="dialog"
        aria-modal="true"
        aria-label="Compare rooms"
        className="w-full max-w-4xl bg-paper p-6 md:p-10"
      >
        <div className="flex justify-between">
          <h2 className="font-display text-5xl">Compare your spaces.</h2>
          <button onClick={() => setCompareOpen(false)} className="text-3xl" aria-label="Close compare">×</button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {rooms.filter(r => compare.includes(r.id)).map(r => <div key={r.id} className="border border-line p-3">
            <Photo src={r.images[0]} alt={r.name} className="aspect-[4/3]" />
            <h3 className="font-display mt-4 text-3xl">
              {r.name}
            </h3>
            <p className="body-copy">{r.size} m² · {r.guests} guests · {r.beds}</p>
            <p className="mt-3 text-sm">{money(r.price)}/night</p>
          </div>)}
        </div>
      </section>
    </div>}<div className="container-site pb-10">
      <InfoNote>Rooms and images are for a design concept only. Availability shown is mock data, not live inventory.</InfoNote>
    </div></>;
}
export default function RoomsPage() {
  return <Suspense fallback={<div className="container-site py-24">Loading rooms…</div>}>
    <RoomsContent />
  </Suspense>;
}

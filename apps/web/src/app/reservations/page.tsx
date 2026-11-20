'use client';
import { DateField, SelectField } from '@/components/form-controls';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { rooms, money, prettyDate, nights, dayISO, addDays, type RoomId } from '@/lib/data';
import { getBookings, saveBookings, type Booking } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, Arrow, InfoNote } from '@/components/ui';
export default function ReservationsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]),
    [tab, setTab] = useState('upcoming'),
    [selected, setSelected] = useState<Booking | null>(null),
    [lookup, setLookup] = useState({ code: '', email: '' }),
    [feedback, setFeedback] = useState(''),
    [editing, setEditing] = useState(false),
    [dates, setDates] = useState({ checkin: '', checkout: '', room: 'deluxe' as RoomId });
  useEffect(() => setBookings(getBookings()), []);
  const persist = (data: Booking[]) => {
    setBookings(data);
    saveBookings(data);
  };
  const current = (b: Booking) => b.status === 'cancelled' ? 'cancelled' : b.status === 'completed' || b.checkout < dayISO() ? 'past' : 'upcoming';
  const visible = bookings.filter(b => current(b) === tab);
  const show = (b: Booking) => {
    setSelected(b);
    setDates({ checkin: b.checkin, checkout: b.checkout, room: b.room });
    setEditing(false);
  };
  const cancel = () => {
    if (!selected) return;
    if (!window.confirm('Cancel this demo booking? No refund is calculated or issued.')) return;
    persist(bookings.map(b => b.code === selected.code ? { ...b, status: 'cancelled' } : b));
    setSelected(null);
  };
  const edit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (dates.checkin < dayISO() || dates.checkout <= dates.checkin) {
      setFeedback('Invalid stay dates.');
      return;
    }
    const r = rooms.find(r => r.id === dates.room)!;
    const total = r.price * nights(dates.checkin, dates.checkout) * selected.count;
    persist(bookings.map(b => b.code === selected.code ? { ...b, ...dates, total } : b));
    setSelected(null);
    setFeedback('Demo reservation updated. No live availability was verified.');
  };
  const lookupBooking = (e: FormEvent) => {
    e.preventDefault();
    const b = bookings.find(b => b.code.toLowerCase() === lookup.code.trim().toLowerCase() && b.email.toLowerCase() === lookup.email.trim().toLowerCase());
    if (b) {
      show(b);
      setFeedback('Found your browser-only booking.');
    } else setFeedback('No matching booking in this browser. Complete a demo reservation in US-04 first.');
  };
  const download = (b: Booking) => {
    const content = `DYLAN GRAND HOTEL — DEMO RESERVATION\nReference: ${b.code}\nGuest: ${b.guest}\nRoom: ${rooms.find(r => r.id === b.room)?.name}\nDates: ${b.checkin} to ${b.checkout}\nStatus: ${b.status}\nEstimated total: ${money(b.total)}\nNOT VALID AS A REAL BOOKING.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b.code}-demo.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return <>
    <PageIntro crumb="MY RESERVATIONS"
      title="Your stay,"
      italic="beautifully arranged."
      description="Your personal space to revisit, adjust and relive the details of your stay — all in this browser-only preview."
    />
    <section className="container-site pb-25">
      <div className="grid gap-6 md:grid-cols-3">
        {[['upcoming', 'Upcoming stays'], ['past', 'Past stays'], ['cancelled', 'Cancelled']].map(([id, title]) => <button key={id}
          onClick={() => setTab(id)}
          className={`border p-6 text-left transition-colors ${tab === id ? 'border-gold bg-surface-alt' : 'border-line bg-paper'}`}
        >
          <Eyebrow>
            {title}
          </Eyebrow>
          <strong className="font-display mt-4 block text-6xl">
            {bookings.filter(b => current(b) === id).length}
          </strong>
        </button>)}
      </div>
      <div className="mt-15">
        <Eyebrow>YOUR RESERVATIONS</Eyebrow>
        <h2 className="section-heading mt-5">Your <em>reservations.</em></h2>
        <div className="mt-8 grid gap-6">
          {visible.map(b => {
            const r = rooms.find(r => r.id === b.room)!;
            return <article key={b.code} className="grid border border-line bg-paper md:grid-cols-[33%_1fr]">
              <Photo src={r.images[0]} alt={r.name} className="min-h-[240px]" />
              <div className="p-7">
                <div className="flex flex-wrap justify-between gap-4">
                  <Eyebrow>DESIGN PREVIEW · {b.code}</Eyebrow>
                  <span className="text-xs font-semibold uppercase text-gold">
                    {b.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-5">
                  <h3 className="font-display text-4xl">
                    {r.name}
                  </h3>
                  <strong>
                    {money(b.total)}
                  </strong>
                </div>
                <p className="body-copy mt-4">{prettyDate(b.checkin)} — {prettyDate(b.checkout)} · {b.adults} guests · {nights(b.checkin, b.checkout)} nights</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => show(b)} className="btn-outline">VIEW DETAILS →</button>
                  <button onClick={() => download(b)} className="btn-outline">DOWNLOAD DEMO SUMMARY ↓</button>
                </div>
              </div>
            </article>;
          })}
          {visible.length === 0 && <div className="border border-line bg-paper py-20 text-center">
            <Eyebrow>NOTHING HERE YET</Eyebrow>
            <h3 className="display mt-6 text-5xl">A story <em>yet to be told.</em></h3>
            <p className="body-copy mt-5">There are no {tab} reservations in this browser.</p>
            <Link href="/availability" className="btn-primary mt-8">EXPLORE ROOMS <Arrow /></Link>
          </div>}
        </div>
      </div>
      <div className="mt-22 grid gap-10 border-t border-line pt-20 lg:grid-cols-2">
        <div>
          <Eyebrow>LOOK UP YOUR STAY</Eyebrow>
          <h2 className="section-heading mt-6">Find your <em>reservation.</em></h2>
          <p className="body-copy mt-6">Search reservations created with this browser. No live hotel reservation database is connected.</p>
        </div>
        <form className="grid gap-4" onSubmit={lookupBooking}>
          <label>
            <span className="field-label">BOOKING REFERENCE</span>
            <input className="field-control"
              value={lookup.code}
              onChange={e => setLookup(s => ({ ...s, code: e.target.value }))}
              placeholder="DGH-DEMO-XXXXXX"
              required
            />
          </label>
          <label>
            <span className="field-label">EMAIL ADDRESS</span>
            <input className="field-control"
              type="email"
              value={lookup.email}
              onChange={e => setLookup(s => ({ ...s, email: e.target.value }))}
              required
            />
          </label>
          <button className="btn-primary" type="submit">FIND RESERVATION <Arrow /></button>
          {feedback && <p role="status" className="text-xs text-muted">
            {feedback}
          </p>}
        </form>
      </div>
    </section>
    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      <section role="dialog"
        aria-modal="true"
        aria-label="Reservation details"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-paper p-7 md:p-10"
      >
        <div className="flex justify-between">
          <Eyebrow>RESERVATION / {selected.code}</Eyebrow>
          <button onClick={() => setSelected(null)} aria-label="Close" className="text-3xl">×</button>
        </div>
        <h2 className="font-display mt-5 text-5xl">
          {rooms.find(r => r.id === selected.room)?.name}
        </h2>
        <div className="mt-6 space-y-3 border-y border-line py-6 text-sm">
          <p><strong>Guest:</strong> {selected.guest} ({selected.email})</p>
          <p><strong>Dates:</strong> {prettyDate(selected.checkin)} – {prettyDate(selected.checkout)}</p>
          <p><strong>Status:</strong> {selected.status}</p>
          <p><strong>Estimated total:</strong> {money(selected.total)}</p>
        </div>
        {editing
          ?
          <form onSubmit={edit} className="mt-7 grid gap-4">
            <DateField label="CHECK-IN"
              value={dates.checkin}
              onValueChange={(date) => setDates((previous) => ({ ...previous, checkin: date }))}
              minDate={dayISO()}
            />
            <DateField label="CHECK-OUT"
              value={dates.checkout}
              onValueChange={(date) => setDates((previous) => ({ ...previous, checkout: date }))}
              minDate={addDays(dates.checkin, 1)}
            />
            <SelectField label="ROOM TYPE"
              value={String(dates.room)}
              options={rooms.map((room) => ({ value: room.id, label: room.name }))}
              onValueChange={(value) => setDates((previous) => ({ ...previous, room: value as RoomId }))}
            />
            <button className="btn-primary">SAVE DEMO CHANGE</button>
          </form>
          :
          <div className="mt-7 flex flex-wrap gap-3">
            {selected.status === 'confirmed' && <>
              <button className="btn-primary" onClick={() => setEditing(true)}>CHANGE STAY</button>
              <button className="btn-outline" onClick={cancel}>CANCEL DEMO BOOKING</button>
            </>}
            <button className="btn-outline" onClick={() => download(selected)}>DOWNLOAD SUMMARY</button>
          </div>}
        <p className="body-copy mt-6 text-xs">Any change here affects this browser only. No live inventory, refund or email processing.</p>
      </section>
    </div>}
    <div className="container-site pb-10">
      <InfoNote>Sample booking management, not a live guest service.</InfoNote>
    </div>
  </>;
}

'use client';
import { Icon } from '@/components/icons';
import { T, useI18n } from '@/components/language-provider';
import { DateField, SelectField } from '@/components/form-controls';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { rooms, money, prettyDate, nights, dayISO, addDays, type RoomId } from '@/lib/data';
import { getBookings, saveBookings, type Booking } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, Arrow } from '@/components/ui';
export default function ReservationsPage() {
  const { t, locale } = useI18n();
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
    if (!window.confirm(t('Cancel this reservation preview? No refund will be issued.'))) return;
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
    setFeedback('Changes saved on this device.');
  };
  const lookupBooking = (e: FormEvent) => {
    e.preventDefault();
    const b = bookings.find(b => b.code.toLowerCase() === lookup.code.trim().toLowerCase() && b.email.toLowerCase() === lookup.email.trim().toLowerCase());
    if (b) {
      show(b);
      setFeedback('Reservation found.');
    } else setFeedback('No matching reservation on this device.');
  };
  const download = (b: Booking) => {
    const content = `DYLAN GRAND HOTEL — DEMO RESERVATION\nReference: ${b.code}\nGuest: ${b.guest}\nRoom: ${rooms.find(r => r.id === b.room)?.name}\nDates: ${b.checkin} to ${b.checkout}\nStatus: ${t(b.status)}\nEstimated total: ${money(b.total)}\nNOT VALID AS A REAL BOOKING.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b.code}-demo.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return <>
    <PageIntro crumb={t("MY RESERVATIONS")}
      title={t("Your stay,")}
      italic={t("beautifully arranged.")}
      description={t("Revisit, adjust and relive the details of your stay.")}
    />
    <section className="container-site pb-25">
      <div className="grid gap-6 md:grid-cols-3">
        {[['upcoming', 'Upcoming stays'], ['past', 'Past stays'], ['cancelled', 'Cancelled']].map(([id, title]) => <button key={id}
          onClick={() => setTab(id)}
          className={`border p-6 text-left transition-colors ${tab === id ? 'border-gold bg-surface-alt' : 'border-line bg-paper'}`}
        >
          <Eyebrow>
            {t(title)}
          </Eyebrow>
          <strong className="font-display mt-4 block text-6xl">
            {bookings.filter(b => current(b) === id).length}
          </strong>
        </button>)}
      </div>
      <div className="mt-15">
        <Eyebrow><T>{"YOUR RESERVATIONS"}</T></Eyebrow>
        <h2 className="section-heading mt-5"><T>{"Your"}</T>{ " " }<em><T>{"reservations."}</T></em></h2>
        <div className="mt-8 grid gap-6">
          {visible.map(b => {
            const r = rooms.find(r => r.id === b.room)!;
            return <article key={b.code} className="grid border border-line bg-paper md:grid-cols-[33%_1fr]">
              <Photo src={r.images[0]} alt={t(r.name)} className="min-h-[240px]" />
              <div className="p-7">
                <div className="flex flex-wrap justify-between gap-4">
                  <Eyebrow><T>{"PREVIEW ·"}</T>{ " " }{b.code}</Eyebrow>
                  <span className="text-xs font-semibold uppercase text-gold">
                    {t(b.status)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-5">
                  <h3 className="font-display text-4xl">
                    {t(r.name)}
                  </h3>
                  <strong>
                    {money(b.total)}
                  </strong>
                </div>
                <p className="body-copy mt-4">{prettyDate(b.checkin, locale)} — {prettyDate(b.checkout, locale)} · {b.adults} <T>{"guests ·"}</T>{ " " }{nights(b.checkin, b.checkout)} <T>{"nights"}</T></p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => show(b)} className="btn-outline"><T>{"VIEW DETAILS →"}</T></button>
                  <button onClick={() => download(b)} className="btn-outline"><T>{"DOWNLOAD SUMMARY ↓"}</T></button>
                </div>
              </div>
            </article>;
          })}
          {visible.length === 0 && <div className="border border-line bg-paper py-20 text-center">
            <Eyebrow><T>{"NOTHING HERE YET"}</T></Eyebrow>
            <h3 className="display mt-6 text-5xl"><T>{"A story"}</T>{ " " }<em><T>{"yet to be told."}</T></em></h3>
            <p className="body-copy mt-5"><T>{"There are no"}</T>{ " " }{tab} <T>{"reservations in this browser."}</T></p>
            <Link href="/availability" className="btn-primary mt-8"><T>{"EXPLORE ROOMS"}</T>{ " " }<Arrow /></Link>
          </div>}
        </div>
      </div>
      <div className="mt-22 grid gap-10 border-t border-line pt-20 lg:grid-cols-2">
        <div>
          <Eyebrow><T>{"LOOK UP YOUR STAY"}</T></Eyebrow>
          <h2 className="section-heading mt-6"><T>{"Find your"}</T>{ " " }<em><T>{"reservation."}</T></em></h2>
          <p className="body-copy mt-6"><T>{"Search reservations created with this browser. No live hotel reservation database is connected."}</T></p>
        </div>
        <form className="grid gap-4" onSubmit={lookupBooking}>
          <label>
            <span className="field-label"><T>{"BOOKING REFERENCE"}</T></span>
            <input className="field-control"
              value={lookup.code}
              onChange={e => setLookup(s => ({ ...s, code: e.target.value }))}
              placeholder={t("DGH-DEMO-XXXXXX")}
              required
            />
          </label>
          <label>
            <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
            <input className="field-control"
              type="email"
              value={lookup.email}
              onChange={e => setLookup(s => ({ ...s, email: e.target.value }))}
              required
            />
          </label>
          <button className="btn-primary" type="submit"><T>{"FIND RESERVATION"}</T>{ " " }<Arrow /></button>
          {feedback && <p role="status" className="text-xs text-muted">
            {t(feedback)}
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
        aria-label={t("Reservation details")}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-paper p-7 md:p-10"
      >
        <div className="flex justify-between">
          <Eyebrow><T>{"RESERVATION /"}</T>{ " " }{selected.code}</Eyebrow>
          <button onClick={() => setSelected(null)} aria-label={t("Close")} className="text-3xl"><Icon name="close" size={22} /></button>
        </div>
        <h2 className="font-display mt-5 text-5xl">
          {t(rooms.find(r => r.id === selected.room)?.name ?? '')}
        </h2>
        <div className="mt-6 space-y-3 border-y border-line py-6 text-sm">
          <p><strong><T>{"Guest:"}</T></strong> {selected.guest} ({selected.email})</p>
          <p><strong><T>{"Dates:"}</T></strong> {prettyDate(selected.checkin, locale)} – {prettyDate(selected.checkout, locale)}</p>
          <p><strong><T>{"Status:"}</T></strong> {t(selected.status)}</p>
          <p><strong><T>{"Estimated total:"}</T></strong> {money(selected.total)}</p>
        </div>
        {editing
          ?
          <form onSubmit={edit} className="mt-7 grid gap-4">
            <DateField label={t("CHECK-IN")}
              value={dates.checkin}
              onValueChange={(date) => setDates((previous) => ({ ...previous, checkin: date }))}
              minDate={dayISO()}
            />
            <DateField label={t("CHECK-OUT")}
              value={dates.checkout}
              onValueChange={(date) => setDates((previous) => ({ ...previous, checkout: date }))}
              minDate={addDays(dates.checkin, 1)}
            />
            <SelectField label={t("ROOM TYPE")}
              value={String(dates.room)}
              options={rooms.map((room) => ({ value: room.id, label: room.name }))}
              onValueChange={(value) => setDates((previous) => ({ ...previous, room: value as RoomId }))}
            />
            <button className="btn-primary"><T>{"SAVE CHANGES"}</T></button>
          </form>
          :
          <div className="mt-7 flex flex-wrap gap-3">
            {selected.status === 'confirmed' && <>
              <button className="btn-primary" onClick={() => setEditing(true)}><T>{"CHANGE STAY"}</T></button>
              <button className="btn-outline" onClick={cancel}><T>{"CANCEL RESERVATION"}</T></button>
            </>}
            <button className="btn-outline" onClick={() => download(selected)}><T>{"DOWNLOAD SUMMARY"}</T></button>
          </div>}
        <p className="body-copy mt-6 text-xs"><T>{"Changes are saved on this device only."}</T></p>
      </section>
    </div>}
  </>;
}

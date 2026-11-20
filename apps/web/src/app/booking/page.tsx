'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { rooms, money, prettyDate, nights } from '@/lib/data';
import { getStay, saveStay, getBookings, saveBookings, type Stay, type Guest } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, Arrow, InfoNote } from '@/components/ui';
type Stage = 0 | 1 | 2 | 3;
export default function BookingPage() {
  const [stay, setStay] = useState<Stay | null>(null),
    [stage, setStage] = useState<Stage>(0),
    [guest, setGuest] = useState<Guest>({ firstName: '', lastName: '', email: '', phone: '', notes: '' }),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(''),
    [code, setCode] = useState('');
  useEffect(() => setStay(getStay()), []);
  if (!stay) return <div className="container-site py-24">Loading your stay…</div>;
  const room = rooms.find(r => r.id === stay.room) || rooms[0];
  const nightCount = nights(stay.checkin, stay.checkout);
  const base = room.price * nightCount * stay.count;
  const rateAdjusted = Math.round(base * (stay.rate === 'advance' ? .88 : 1));
  const addOn = (stay.breakfast ? 320000 * stay.adults * nightCount : 0) + (stay.transfer ? 450000 : 0) + (stay.lateCheckout ? 300000 : 0);
  const discount = stay.promo.trim().toUpperCase() === 'DYLAN10' ? Math.round((rateAdjusted + addOn) * .1) : 0;
  const total = rateAdjusted + addOn - discount;
  const update = (patch: Partial<Stay>) => {
    setStay(s => s ? { ...s, ...patch } : s);
    saveStay(patch);
  };
  const steps = ['YOUR RATE', 'PERSONALISE', 'GUEST DETAILS', 'REVIEW & CONFIRM'];
  const next = () => {
    setError('');
    if (stage === 2) {
      if (!guest.firstName.trim() || !guest.lastName.trim() || !/^\S+@\S+\.\S+$/.test(guest.email)) {
        setError('Please complete your name and a valid email.');
        return;
      }
    }
    if (stage === 3) {
      if (!accepted) {
        setError('Please acknowledge this is a non-binding demo booking.');
        return;
      }
      const reference = `DGH-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      saveBookings([{
        code: reference,
        room: room.id,
        checkin: stay.checkin,
        checkout: stay.checkout,
        adults: stay.adults,
        count: stay.count,
        rate: stay.rate,
        guest: `${guest.firstName.trim()} ${guest.lastName.trim()}`,
        email: guest.email.trim(),
        total,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        breakfast: stay.breakfast,
        transfer: stay.transfer,
        lateCheckout: stay.lateCheckout,
        isDemo: true
      }, ...getBookings()]);
      setCode(reference);
      setStage(0);
      return;
    }
    setStage((stage + 1) as Stage);
  };
  return <>
    <PageIntro crumb="YOUR RESERVATION"
      title="Make yourself"
      italic="at home."
      description="A few thoughtful details and your stay is almost arranged. Complete this frontend-only reservation preview."
    />
    <section className="container-site pb-25">
      <div className="grid gap-10 lg:grid-cols-[1fr_370px]">
        <div>
          {code
            ?
            <div className="border border-line bg-paper px-8 py-20 text-center">
              <span className="font-display text-7xl text-gold">✓</span>
              <Eyebrow>YOUR STAY IS ARRANGED — DEMO ONLY</Eyebrow>
              <h2 className="display mt-7 text-6xl">See you <em>soon.</em></h2>
              <p className="mt-6 text-sm">Sample booking reference:</p>
              <strong className="mt-3 block break-words font-mono text-xl">
                {code}
              </strong>
              <p className="body-copy mx-auto mt-6 max-w-md">We have saved this preview reservation in your browser. No actual room was reserved and no email or payment was processed.</p>
              <Link href="/reservations" className="btn-primary mt-9">MANAGE YOUR DEMO BOOKING <Arrow /></Link>
            </div>
            :
            <>
              <div className="mb-10 grid grid-cols-4 gap-1 border-b border-line pb-6">
                {steps.map((name, i) => <div key={name} className={`min-w-0 border-t-2 pt-3 ${i <= stage ? 'border-gold' : 'border-line'}`}>
                  <span className="text-[9px] font-semibold tracking-wider text-muted">0{i + 1}</span>
                  <p className="mt-2 text-[10px] font-semibold tracking-wider uppercase max-sm:text-[8px]">
                    {name}
                  </p>
                </div>)}
              </div>
              {stage === 0 && <div className="animate-in">
                <Eyebrow>01 / SELECT YOUR RATE</Eyebrow>
                <h2 className="font-display mt-5 text-5xl">Stay your way.</h2>
                <p className="body-copy mt-3 mb-9">Select the pricing and flexibility option that feels right for you.</p>
                <div className="grid gap-4">
                  {[{
                    id: 'flexible',
                    name: 'Flexible stay',
                    desc: 'Flexible conditions — illustrative. Final cancellation policy pending confirmation.',
                    price: base
                  }, {
                    id: 'advance',
                    name: 'Advance purchase',
                    desc: '12% sample discount. Concept non-refundable conditions.',
                    price: Math.round(base * .88)
                  }].map(r => <button type="button"
                    key={r.id}
                    onClick={() => update({ rate: r.id as Stay['rate'] })}
                    className={`flex flex-wrap justify-between gap-4 border p-6 text-left transition-colors ${stay.rate === r.id ? 'border-gold bg-surface-alt' : 'border-line bg-paper hover:border-gold'}`}
                  >
                    <span>
                      <strong className="font-display text-3xl">
                        {r.name}
                      </strong>
                      <span className="body-copy mt-2 block max-w-md">
                        {r.desc}
                      </span>
                    </span>
                    <strong className="text-sm">
                      {money(r.price)}
                    </strong>
                  </button>)}
                </div>
              </div>}
              {stage === 1 && <div className="animate-in">
                <Eyebrow>02 / PERSONALISE YOUR STAY</Eyebrow>
                <h2 className="font-display mt-5 text-5xl">A little extra.</h2>
                <p className="body-copy mt-3 mb-8">Choose the touches that make your trip feel entirely yours.</p>
                {[
                  {
                    key: 'breakfast',
                    title: 'Breakfast each morning',
                    price: 320000 * stay.adults * nightCount,
                    desc: 'A leisurely breakfast for the guests across your stay.'
                  },
                  { key: 'transfer', title: 'Private airport transfer', price: 450000, desc: 'A smooth start to your arrival in Saigon.' },
                  { key: 'lateCheckout', title: 'Late check-out', price: 300000, desc: 'More time for the moments worth keeping.' }
                ].map(x => <label key={x.key}
                  className="mb-4 flex items-center justify-between gap-5 border border-line bg-paper p-6"
                >
                  <span>
                    <strong className="font-display text-3xl">
                      {x.title}
                    </strong>
                    <span className="body-copy block">
                      {x.desc}
                    </span>
                    <span className="mt-2 block text-xs">+ {money(x.price)}</span>
                  </span>
                  <input type="checkbox"
                    checked={Boolean(stay[x.key as 'breakfast' | 'transfer' | 'lateCheckout'])}
                    onChange={e => update({ [x.key]: e.target.checked })}
                    className="h-5 w-5 accent-gold"
                  />
                </label>)}
                <label className="mt-7 block">
                  <span className="field-label">PROMO CODE (OPTIONAL)</span>
                  <input className="field-control max-w-sm"
                    placeholder="Try DYLAN10"
                    value={stay.promo}
                    onChange={e => update({ promo: e.target.value })}
                  />
                </label>
              </div>}
              {stage === 2 && <div className="animate-in">
                <Eyebrow>03 / YOUR DETAILS</Eyebrow>
                <h2 className="font-display mt-5 text-5xl">Who is joining us?</h2>
                <p className="body-copy mt-3 mb-8">We only keep these details in your browser for the demonstration.</p>
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    ['firstName', 'FIRST NAME', 'text'],
                    ['lastName', 'LAST NAME', 'text'],
                    ['email', 'EMAIL ADDRESS', 'email'],
                    ['phone', 'PHONE NUMBER', 'tel']
                  ].map(([key, label, type]) => <label key={key}>
                    <span className="field-label">
                      {label}
                    </span>
                    <input className="field-control"
                      type={type}
                      required={key !== 'phone'}
                      value={guest[key as keyof Guest]}
                      onChange={e => setGuest(s => ({ ...s, [key]: e.target.value }))}
                    />
                  </label>)}
                  <label className="md:col-span-2">
                    <span className="field-label">SPECIAL REQUESTS (OPTIONAL)</span>
                    <textarea className="field-control min-h-28"
                      value={guest.notes}
                      onChange={e => setGuest(s => ({ ...s, notes: e.target.value }))}
                    />
                  </label>
                </div>
              </div>}
              {stage === 3 && <div className="animate-in">
                <Eyebrow>04 / REVIEW YOUR STAY</Eyebrow>
                <h2 className="font-display mt-5 text-5xl">Almost there.</h2>
                <div className="my-8 border border-line bg-paper p-6 text-sm leading-9">
                  <div className="flex justify-between gap-3">
                    <span>Lead guest</span>
                    <strong>{guest.firstName} {guest.lastName}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Email</span>
                    <strong className="break-all">
                      {guest.email}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Room</span>
                    <strong>
                      {room.name}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Stay dates</span>
                    <strong>{prettyDate(stay.checkin)} – {prettyDate(stay.checkout)}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Rate</span>
                    <strong>
                      {stay.rate === 'flexible' ? 'Flexible' : 'Advance'}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-3">
                    <span>Total estimate</span>
                    <strong>
                      {money(total)}
                    </strong>
                  </div>
                </div>
                <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="mt-1.5 accent-gold"
                />I understand that this is a portfolio demonstration, not a real reservation, payment or hotel confirmation.</label>
              </div>}
              {error && <p role="alert" className="mt-6 text-sm text-red-700">
                {error}
              </p>}
              <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-line pt-7">
                {stage > 0
                  ?
                  <button className="btn-outline" onClick={() => {
                    setError('');
                    setStage((stage - 1) as Stage);
                  }}>← PREVIOUS STEP</button>
                  :
                  <Link className="btn-outline" href="/availability">← BACK TO ROOMS</Link>}
                <button className="btn-primary" onClick={next}>{stage === 3 ? 'CONFIRM DEMO BOOKING' : 'CONTINUE'} <Arrow /></button>
              </div>
            </>}
        </div>
        <aside className="self-start border border-line bg-paper lg:sticky lg:top-32">
          <Photo src={room.images[0]} alt={`${room.name} sample hotel room`} className="aspect-[16/10]" />
          <div className="p-6">
            <Eyebrow>YOUR RESERVATION</Eyebrow>
            <h3 className="font-display mt-3 text-4xl">
              {room.name}
            </h3>
            <p className="body-copy mt-4">{prettyDate(stay.checkin)} — {prettyDate(stay.checkout)} · {nightCount} nights</p>
            <p className="body-copy">{stay.adults} adults · {stay.count} room(s)</p>
            <div className="my-7 grid gap-3 border-t border-line pt-5 text-xs">
              <div className="flex justify-between">
                <span>Accommodation</span>
                <span>
                  {money(base)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rate adjustment</span>
                <span>
                  {money(rateAdjusted - base)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Extras</span>
                <span>
                  {money(addOn)}
                </span>
              </div>
              {discount > 0 && <div className="flex justify-between">
                <span>Promo discount</span>
                <span>-{money(discount)}</span>
              </div>}
            </div>
            <div className="flex justify-between border-t border-line pt-5">
              <strong>ESTIMATED TOTAL</strong>
              <strong>
                {money(total)}
              </strong>
            </div>
            <p className="mt-5 text-[11px] leading-6 text-muted">All amounts are illustrative; no live pricing, taxes or payment processing.</p>
          </div>
        </aside>
      </div>
    </section>
    <div className="container-site pb-12">
      <InfoNote>Booking is intentionally browser-only. No inventory is reserved, no account is authenticated and no payment is charged.</InfoNote>
    </div>
  </>;
}

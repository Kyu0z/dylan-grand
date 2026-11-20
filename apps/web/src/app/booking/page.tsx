'use client';
import { T, useI18n } from '@/components/language-provider';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { rooms, money, prettyDate, nights } from '@/lib/data';
import { getStay, saveStay, getBookings, saveBookings, type Stay, type Guest } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, Arrow, InfoNote } from '@/components/ui';
type Stage = 0 | 1 | 2 | 3;
export default function BookingPage() {
  const { t, locale } = useI18n();
  const [stay, setStay] = useState<Stay | null>(null),
    [stage, setStage] = useState<Stage>(0),
    [guest, setGuest] = useState<Guest>({ firstName: '', lastName: '', email: '', phone: '', notes: '' }),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(''),
    [code, setCode] = useState('');
  useEffect(() => setStay(getStay()), []);
  if (!stay) return <div className="container-site py-24"><T>{"Loading your stay…"}</T></div>;
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
    <PageIntro crumb={t("YOUR RESERVATION")}
      title={t("Make yourself")}
      italic={t("at home.")}
      description={t("A few thoughtful details and your stay is almost arranged. Complete this frontend-only reservation preview.")}
    />
    <section className="container-site pb-25">
      <div className="grid gap-10 lg:grid-cols-[1fr_370px]">
        <div>
          {code
            ?
            <div className="border border-line bg-paper px-8 py-20 text-center">
              <span className="font-display text-7xl text-gold">✓</span>
              <Eyebrow><T>{"YOUR STAY IS ARRANGED — DEMO ONLY"}</T></Eyebrow>
              <h2 className="display mt-7 text-6xl"><T>{"See you"}</T>{ " " }<em><T>{"soon."}</T></em></h2>
              <p className="mt-6 text-sm"><T>{"Sample booking reference:"}</T></p>
              <strong className="mt-3 block break-words font-mono text-xl">
                {code}
              </strong>
              <p className="body-copy mx-auto mt-6 max-w-md"><T>{"We have saved this preview reservation in your browser. No actual room was reserved and no email or payment was processed."}</T></p>
              <Link href="/reservations" className="btn-primary mt-9"><T>{"MANAGE YOUR DEMO BOOKING"}</T>{ " " }<Arrow /></Link>
            </div>
            :
            <>
              <div className="mb-10 grid grid-cols-4 gap-1 border-b border-line pb-6">
                {steps.map((name, i) => <div key={name} className={`min-w-0 border-t-2 pt-3 ${i <= stage ? 'border-gold' : 'border-line'}`}>
                  <span className="text-[9px] font-semibold tracking-wider text-muted">0{i + 1}</span>
                  <p className="mt-2 text-[10px] font-semibold tracking-wider uppercase max-sm:text-[8px]">
                    {t(name)}
                  </p>
                </div>)}
              </div>
              {stage === 0 && <div className="animate-in">
                <Eyebrow><T>{"01 / SELECT YOUR RATE"}</T></Eyebrow>
                <h2 className="font-display mt-5 text-5xl"><T>{"Stay your way."}</T></h2>
                <p className="body-copy mt-3 mb-9"><T>{"Select the pricing and flexibility option that feels right for you."}</T></p>
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
                        {t(r.name)}
                      </strong>
                      <span className="body-copy mt-2 block max-w-md">
                        {t(r.desc)}
                      </span>
                    </span>
                    <strong className="text-sm">
                      {money(r.price)}
                    </strong>
                  </button>)}
                </div>
              </div>}
              {stage === 1 && <div className="animate-in">
                <Eyebrow><T>{"02 / PERSONALISE YOUR STAY"}</T></Eyebrow>
                <h2 className="font-display mt-5 text-5xl"><T>{"A little extra."}</T></h2>
                <p className="body-copy mt-3 mb-8"><T>{"Choose the touches that make your trip feel entirely yours."}</T></p>
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
                      {t(x.title)}
                    </strong>
                    <span className="body-copy block">
                      {t(x.desc)}
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
                  <span className="field-label"><T>{"PROMO CODE (OPTIONAL)"}</T></span>
                  <input className="field-control max-w-sm"
                    placeholder={t("Try DYLAN10")}
                    value={stay.promo}
                    onChange={e => update({ promo: e.target.value })}
                  />
                </label>
              </div>}
              {stage === 2 && <div className="animate-in">
                <Eyebrow><T>{"03 / YOUR DETAILS"}</T></Eyebrow>
                <h2 className="font-display mt-5 text-5xl"><T>{"Who is joining us?"}</T></h2>
                <p className="body-copy mt-3 mb-8"><T>{"We only keep these details in your browser for the demonstration."}</T></p>
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    ['firstName', 'FIRST NAME', 'text'],
                    ['lastName', 'LAST NAME', 'text'],
                    ['email', 'EMAIL ADDRESS', 'email'],
                    ['phone', 'PHONE NUMBER', 'tel']
                  ].map(([key, label, type]) => <label key={key}>
                    <span className="field-label">
                      {t(label)}
                    </span>
                    <input className="field-control"
                      type={type}
                      required={key !== 'phone'}
                      value={guest[key as keyof Guest]}
                      onChange={e => setGuest(s => ({ ...s, [key]: e.target.value }))}
                    />
                  </label>)}
                  <label className="md:col-span-2">
                    <span className="field-label"><T>{"SPECIAL REQUESTS (OPTIONAL)"}</T></span>
                    <textarea className="field-control min-h-28"
                      value={guest.notes}
                      onChange={e => setGuest(s => ({ ...s, notes: e.target.value }))}
                    />
                  </label>
                </div>
              </div>}
              {stage === 3 && <div className="animate-in">
                <Eyebrow><T>{"04 / REVIEW YOUR STAY"}</T></Eyebrow>
                <h2 className="font-display mt-5 text-5xl"><T>{"Almost there."}</T></h2>
                <div className="my-8 border border-line bg-paper p-6 text-sm leading-9">
                  <div className="flex justify-between gap-3">
                    <span><T>{"Lead guest"}</T></span>
                    <strong>{guest.firstName} {guest.lastName}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span><T>{"Email"}</T></span>
                    <strong className="break-all">
                      {guest.email}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span><T>{"Room"}</T></span>
                    <strong>
                      {t(room.name)}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span><T>{"Stay dates"}</T></span>
                    <strong>{prettyDate(stay.checkin, locale)} – {prettyDate(stay.checkout, locale)}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span><T>{"Rate"}</T></span>
                    <strong>
                      {stay.rate === 'flexible' ? 'Flexible' : 'Advance'}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-3">
                    <span><T>{"Total estimate"}</T></span>
                    <strong>
                      {money(total)}
                    </strong>
                  </div>
                </div>
                <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="mt-1.5 accent-gold"
                /><T>{"I understand that this is a portfolio demonstration, not a real reservation, payment or hotel confirmation."}</T></label>
              </div>}
              {error && <p role="alert" className="mt-6 text-sm text-red-700">
                {t(error)}
              </p>}
              <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-line pt-7">
                {stage > 0
                  ?
                  <button className="btn-outline" onClick={() => {
                    setError('');
                    setStage((stage - 1) as Stage);
                  }}><T>{"← PREVIOUS STEP"}</T></button>
                  :
                  <Link className="btn-outline" href="/availability"><T>{"← BACK TO ROOMS"}</T></Link>}
                <button className="btn-primary" onClick={next}>{stage === 3 ? 'CONFIRM DEMO BOOKING' : 'CONTINUE'} <Arrow /></button>
              </div>
            </>}
        </div>
        <aside className="self-start border border-line bg-paper lg:sticky lg:top-32">
          <Photo src={room.images[0]} alt={`${t(room.name)} sample hotel room`} className="aspect-[16/10]" />
          <div className="p-6">
            <Eyebrow><T>{"YOUR RESERVATION"}</T></Eyebrow>
            <h3 className="font-display mt-3 text-4xl">
              {t(room.name)}
            </h3>
            <p className="body-copy mt-4">{prettyDate(stay.checkin, locale)} — {prettyDate(stay.checkout, locale)} · {nightCount} <T>{"nights"}</T></p>
            <p className="body-copy">{stay.adults} <T>{"adults ·"}</T>{ " " }{stay.count} <T>{"room(s)"}</T></p>
            <div className="my-7 grid gap-3 border-t border-line pt-5 text-xs">
              <div className="flex justify-between">
                <span><T>{"Accommodation"}</T></span>
                <span>
                  {money(base)}
                </span>
              </div>
              <div className="flex justify-between">
                <span><T>{"Rate adjustment"}</T></span>
                <span>
                  {money(rateAdjusted - base)}
                </span>
              </div>
              <div className="flex justify-between">
                <span><T>{"Extras"}</T></span>
                <span>
                  {money(addOn)}
                </span>
              </div>
              {discount > 0 && <div className="flex justify-between">
                <span><T>{"Promo discount"}</T></span>
                <span>-{money(discount)}</span>
              </div>}
            </div>
            <div className="flex justify-between border-t border-line pt-5">
              <strong><T>{"ESTIMATED TOTAL"}</T></strong>
              <strong>
                {money(total)}
              </strong>
            </div>
            <p className="mt-5 text-[11px] leading-6 text-muted"><T>{"All amounts are illustrative; no live pricing, taxes or payment processing."}</T></p>
          </div>
        </aside>
      </div>
    </section>
    <div className="container-site pb-12">
      <InfoNote><T>{"Booking is intentionally browser-only. No inventory is reserved, no account is authenticated and no payment is charged."}</T></InfoNote>
    </div>
  </>;
}

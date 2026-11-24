'use client';
import { T, useI18n } from '@/components/language-provider';
import { DateField, SelectField } from '@/components/form-controls';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { photos, rooms, addDays, dayISO } from '@/lib/data';
import { saveStay } from '@/lib/storage';
import { Arrow, Eyebrow, Photo, RoomCard, SectionTitle } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons';
export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [checkin, setCheckin] = useState(addDays(dayISO(), 14)),
    [checkout, setCheckout] = useState(addDays(dayISO(), 17)),
    [adults, setAdults] = useState(2),
    [faq, setFaq] = useState<number | null>(null),
    [error, setError] = useState('');
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkout <= checkin) {
      setError('Check-out must be after check-in.');
      return;
    }
    saveStay({ checkin, checkout, adults });
    router.push('/availability');
  };
  return <>
    <section className="grid min-h-[640px] lg:grid-cols-[45%_55%]">
      <div className="flex flex-col justify-center bg-forest px-7 py-18 text-surface sm:px-14 lg:px-[max(7vw,70px)]">
        <Eyebrow light><T>{"AN INTIMATE ESCAPE IN THE HEART OF SAIGON"}</T></Eyebrow>
        <h1 className="display mt-12 text-[clamp(5rem,7.5vw,9rem)] animate-in"><T>{"The art of"}</T><br /><em><T>{"feeling at"}</T></em><br /><T>{"home."}</T></h1>
        <p className="mt-9 max-w-[410px] text-sm leading-8 text-surface/75 animate-in animate-delay"><T>{"Quiet elegance, thoughtful details and the warmth of a truly personal welcome. A new rhythm for your time in the city."}</T></p>
        <Link href="/rooms" className="line-link mt-12 w-fit text-surface"><T>{"DISCOVER OUR ROOMS"}</T>{ " " }<Arrow /></Link>
        <span className="mt-16 text-[10px] tracking-[.2em] text-gold uppercase"><T>{"01 / 04 — THE DYLAN EXPERIENCE"}</T></span>
      </div>
      <Photo src={photos.hero}
        alt={t("Luxury hotel exterior with palm trees")}
        className="min-h-[440px] lg:min-h-[640px]"
        priority
      />
    </section>
    <section className="relative z-10 -mt-3 bg-surface pb-8 pt-6">
      <div className="container-site">
        <form onSubmit={search}
          className="grid gap-3 border border-line bg-paper p-5 shadow-[var(--shadow)] md:grid-cols-[1fr_1fr_1fr_auto] md:items-end md:p-7"
        >
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
          <SelectField label={t("GUESTS")}
            value={String(adults)}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'adult' : 'adults'}` }))}
            onValueChange={(value) => setAdults(Number(value))}
          />
          <button type="submit" className="btn-primary h-12"><T>{"CHECK AVAILABILITY"}</T>{ " " }<Arrow /></button>
        </form>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">
          {t(error)}
        </p>}
      </div>
    </section>
    <section className="section-pad container-site grid gap-14 lg:grid-cols-2 lg:items-center">
      <div>
        <Eyebrow><T>{"01 / OUR PHILOSOPHY"}</T></Eyebrow>
        <h2 className="section-heading mt-7"><T>{"A different pace."}</T><br /><em><T>{"A more meaningful"}</T></em> <T>{"stay."}</T></h2>
      </div>
      <div className="max-w-[510px]">
        <p className="body-copy text-[16px]"><T>{"Dylan Grand Hotel is imagined as a refined retreat from the rhythm of the city. Contemporary comforts and timeless hospitality find their balance here."}</T></p>
        <p className="body-copy mt-5"><T>{"Whether the morning begins slowly or the evening takes you somewhere new, every detail is designed to make it feel like yours."}</T></p>
        <Link href="#gallery" className="line-link mt-9"><T>{"EXPLORE OUR STORY"}</T>{ " " }<Arrow /></Link>
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <SectionTitle index={t("02 / ROOMS & SUITES")}
          title={t("Stay")}
          italic={t("beautifully.")}
          action={<Link href="/rooms" className="line-link"><T>{"EXPLORE ALL ROOMS"}</T>{ " " }<Arrow diagonal /></Link>}
        />
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map(r => <RoomCard key={r.id} room={r} />)}
        </div>
      </div>
    </section>
    <section className="grid min-h-[500px] lg:grid-cols-2">
      <Photo src={photos.experience} alt={t("Relaxing hotel poolside setting")} className="min-h-[390px]" />
      <div className="flex flex-col justify-center bg-forest p-9 text-surface md:p-16 lg:p-24">
        <Eyebrow light><T>{"03 / EXPERIENCES"}</T></Eyebrow>
        <h2 className="display mt-9 text-[clamp(3.8rem,5vw,6.5rem)]"><T>{"More than a stay."}</T><br /><em><T>{"A story to remember."}</T></em></h2>
        <p className="mt-7 max-w-lg text-sm leading-8 text-surface/75"><T>{"From a slow morning to an unforgettable evening, every moment is designed to be savoured. Discover quiet spaces, local flavours and the freedom to simply be."}</T></p>
        <Link href="/experiences" className="line-link mt-10 w-fit text-surface"><T>{"EXPLORE EXPERIENCES"}</T>{ " " }<Arrow /></Link>
      </div>
    </section>
    <section id="gallery" className="container-site section-pad">
      <SectionTitle index={t("04 / THE COLLECTION")} title={t("A sense of")} italic={t("place.")} />
      <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
        <Photo src={photos.lobby}
          alt={t("Hotel lobby and reception")}
          className="aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[500px]"
        />
        <Photo src={rooms[0].images[1]} alt={t("Warm hotel guest bedroom")} className="aspect-[4/3]" />
        <Photo src={photos.interior} alt={t("Hotel interior lobby")} className="aspect-[4/3]" />
        <Photo src={rooms[1].images[1]} alt={t("Premium hotel room")} className="aspect-[4/3]" />
        <Photo src={photos.facade} alt={t("Hotel architecture")} className="aspect-[4/3]" />
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <SectionTitle index={t("05 / AMENITIES")} title={t("The little things,")} italic={t("beautifully done.")} />
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['pool', 'Rooftop Pool', 'A pause above the rhythm of the city, from golden hour to twilight.'],
            ['dining', 'Thoughtful Dining', 'Seasonal flavours and intimate spaces to savour every moment.'],
            ['wellness', 'Wellness Rituals', 'Restore your rhythm with considered therapies and tranquil surroundings.'],
            ['comfort', 'Seamless Comfort', 'Thoughtful essentials for moments of discovery and days of rest.']
          ].map(([icon, title, copy]) => <div className="border-t border-line pt-7" key={t(title)}>
            <span className="inline-flex h-14 items-center text-gold">
              <Icon name={icon as IconName} size={38} strokeWidth={1.35} />
            </span>
            <h3 className="font-display mt-7 text-3xl">
              {t(title)}
            </h3>
            <p className="body-copy mt-4">
              {t(copy)}
            </p>
          </div>)}
        </div>
      </div>
    </section>
    <section className="bg-forest py-20 text-surface">
      <div className="container-site flex flex-wrap items-center justify-between gap-10">
        <div>
          <Eyebrow light><T>{"06 / EXCLUSIVE OFFER"}</T></Eyebrow>
          <h2 className="display mt-6 text-6xl"><T>{"Make room for"}</T>{ " " }<em><T>{"more."}</T></em></h2>
          <p className="mt-4 max-w-xl text-sm leading-8 text-surface/70"><T>{"Thoughtfully curated stays. Experience a little more of Dylan Grand."}</T></p>
        </div>
        <Link href="/availability" className="btn-outline border-surface/40 text-surface"><T>{"DISCOVER YOUR STAY"}</T>{ " " }<Arrow diagonal /></Link>
      </div>
    </section>
    <section className="section-pad container-site">
      <SectionTitle index={t("07 / THE JOURNAL")} title={t("Notes from")} italic={t("Saigon.")} />
      <div className="grid gap-8 md:grid-cols-2">
        {[{
          img: photos.facade,
          tag: 'DESIGN & HOSPITALITY',
          name: 'The beauty of staying in',
          copy: 'A few details that make even a short stay memorable.'
        }, {
          img: photos.dining,
          tag: 'TRAVEL INSPIRATION',
          name: 'A different view of the city',
          copy: 'Small moments, neighbourhood discoveries and beautifully slow days.'
        }].map(x => <article key={x.name}>
          <Photo src={x.img} alt={x.name} className="aspect-[16/9]" />
          <div className="mt-6">
            <Eyebrow>
              {x.tag}
            </Eyebrow>
            <h3 className="font-display mt-3 text-4xl">
              {x.name}
            </h3>
            <p className="body-copy mt-2">
              {x.copy}
            </p>
          </div>
        </article>)}
      </div>
    </section>
    <section className="section-pad border-t border-line bg-paper">
      <div className="container-site grid gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow><T>{"08 / BEFORE YOU ARRIVE"}</T></Eyebrow>
          <h2 className="section-heading mt-6"><T>{"Good to"}</T>{ " " }<em><T>{"know."}</T></em></h2>
          <p className="body-copy mt-6 max-w-md"><T>{"A considered stay begins with clear expectations."}</T></p>
        </div>
        <div>
          {[
            ['When can I check in and out?', 'Check-in and check-out times are determined by the hotel and shown on each confirmed reservation.'],
            ['Can I change or cancel my reservation?', 'Changes and cancellations depend on the selected rate plan.'],
            ['Is breakfast included?', 'Breakfast inclusion varies by rate plan. Review your selected additions.'],
            ['How do I contact the hotel?', 'Guest support is not available online yet.']
          ].map(([q, a], i) => <div className="border-b border-line" key={t(q)}>
            <button onClick={() => setFaq(faq === i ? null : i)}
              aria-expanded={faq === i}
              className="flex w-full justify-between gap-4 py-6 text-left text-sm font-medium"
            >
              {t(q)}
              <span className="text-xl text-gold">
                <Icon name={faq === i ? 'minus' : 'plus'} size={20} />
              </span>
            </button>
            {faq === i && <p className="body-copy pb-6">
              {t(a)}
            </p>}
          </div>)}
        </div>
      </div>
    </section>
  </>;
}

'use client';

import { T, useI18n } from '@/components/language-provider';
import { DateField, SelectField } from '@/components/form-controls';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { photos, roomArtwork, addDays, dayISO } from '@/lib/data';
import { useRooms, useLiveData, type Hotel } from '@/lib/live-data';
import { saveStay } from '@/lib/storage';
import { Arrow, Eyebrow, Photo, RoomShowcase, SectionTitle } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons';

const collectionPhotos = [
  {
    src: photos.facade,
    alt: 'English boutique hotel exterior',
    className: 'aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:h-full'
  },
  {
    src: photos.interior,
    alt: 'Refined hotel lounge',
    className: 'aspect-[4/3]'
  },
  {
    src: roomArtwork[1].images[0],
    alt: 'Garden-facing guest room',
    className: 'aspect-[4/3]'
  },
  {
    src: photos.editorialDining,
    alt: 'Elegant breakfast room',
    className: 'aspect-[4/3]'
  },
  { src: photos.garden, alt: 'Hotel garden', className: 'aspect-[4/3]' }
];

const amenities: { icon: IconName; title: string; copy: string }[] = [
  { icon: 'pool', title: 'Rooftop Pool', copy: 'A pause above the rhythm of the city, from golden hour to twilight.' },
  { icon: 'dining', title: 'Thoughtful Dining', copy: 'Seasonal flavours and intimate spaces to savour every moment.' },
  { icon: 'wellness', title: 'Wellness Rituals', copy: 'Restore your rhythm with considered therapies and tranquil surroundings.' },
  { icon: 'bed', title: 'Seamless Comfort', copy: 'Thoughtful essentials for moments of discovery and days of rest.' }
];

const journalEntries = [
  {
    img: photos.garden,
    tag: 'NEIGHBOURHOOD NOTES',
    name: 'Slow mornings in the English countryside',
    copy: 'Garden walks, local produce and the pleasure of beginning the day without hurry.'
  },
  {
    img: photos.dining,
    tag: 'HOUSE RITUALS',
    name: 'An afternoon shaped by tea and conversation',
    copy: 'A quietly elegant pause with seasonal pastries, loose-leaf blends and time to linger.'
  },
  {
    img: photos.coast,
    tag: 'DAY EXCURSIONS',
    name: 'Where to wander beyond the hotel',
    copy: 'From peaceful gardens to heritage towns, discover a gentler side of England.'
  }
];

const faqs = [
  {
    question: 'Can the hotel arrange early arrival or a later departure?',
    answer:
      'Yes. Subject to availability, our team can note an early check-in or late check-out request and confirm it closer to arrival.'
  },
  {
    question: 'Do you provide parking or private transfers?',
    answer:
      'Please contact the hotel before arrival to confirm parking availability or request private transfer arrangements.'
  },
  {
    question: 'Can you help with dining reservations and local experiences?',
    answer:
      'Absolutely. We can assist with afternoon tea, nearby dining recommendations and a curated selection of local experiences.'
  },
  {
    question: 'Is Dylan Grand Hotel suitable for families or celebratory stays?',
    answer:
      'Yes. Selected room categories work well for families, and our team can help prepare thoughtful touches for birthdays, anniversaries and special occasions.'
  }
];

export default function HomePage() {
  const { t, locale } = useI18n();
  const { rooms, loading, failed, reload } = useRooms();
  const hotel = useLiveData<Hotel>('/hotel');
  const router = useRouter();
  const [checkin, setCheckin] = useState(addDays(dayISO(), 14));
  const [checkout, setCheckout] = useState(addDays(dayISO(), 17));
  const [adults, setAdults] = useState(2);
  const [faq, setFaq] = useState<number | null>(null);
  const [error, setError] = useState('');

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkout <= checkin) {
      setError('Check-out must be after check-in.');
      return;
    }
    saveStay({ checkin, checkout, adults, count: 1, children: 0 });
    router.push('/availability');
  };

  return (
    <>
      <section className="grid min-h-[680px] lg:grid-cols-[44%_56%] 2xl:min-h-[760px]">
        <div className="flex flex-col justify-center min-w-0 bg-forest px-7 py-18 text-surface sm:px-14 lg:px-[clamp(3rem,5vw,7rem)]">
          <Eyebrow>
            <T>{'A BOUTIQUE ESCAPE IN SOUTHERN ENGLAND'}</T>
          </Eyebrow>
          <h1 className="hero-title mt-10 animate-in text-balance">
            <T>{'The art of'}</T>
            <br />
            <em>
              <T>{'feeling at'}</T>
            </em>
            <br />
            <T>{'home.'}</T>
          </h1>
          <p className="mt-8 max-w-[32rem] text-sm leading-8 text-surface/75 animate-in animate-delay text-pretty">
            <T>{'Graceful interiors, restful mornings and a quietly personal welcome. A slower, more considered rhythm for your stay in England.'}</T>
          </p>
          <Link href="/rooms" className="line-link mt-12 w-fit text-surface">
            <T>{'DISCOVER OUR ROOMS'}</T> <Arrow />
          </Link>
          <span className="mt-16 text-[10px] tracking-[.2em] text-gold uppercase">
            <T>{'01 / 04 — THE DYLAN EXPERIENCE'}</T>
          </span>
        </div>
        <Photo src={photos.editorialHero} alt={t('Hotel architecture')} className="min-h-[440px] lg:min-h-[680px] 2xl:min-h-[760px]" priority />
      </section>

      <section className="relative z-10 -mt-3 bg-surface pb-8 pt-6">
        <div className="container-site">
          <form
            onSubmit={search}
            className="grid gap-3 border border-line bg-paper p-5 shadow-[var(--shadow)] md:grid-cols-[1fr_1fr_1fr_auto] md:items-end md:p-7"
          >
            <DateField label={t('CHECK-IN')} value={checkin} onValueChange={(date) => setCheckin(date)} minDate={dayISO()} />
            <DateField label={t('CHECK-OUT')} value={checkout} onValueChange={(date) => setCheckout(date)} minDate={addDays(checkin, 1)} />
            <SelectField
              label={t('GUESTS')}
              value={String(adults)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'adult' : 'adults'}` }))}
              onValueChange={(value) => setAdults(Number(value))}
            />
            <button type="submit" className="btn-primary h-12">
              <T>{'CHECK AVAILABILITY'}</T> <Arrow />
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {t(error)}
            </p>
          )}
        </div>
      </section>

      <section className="section-pad container-site grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <Eyebrow>
            <T>{'01 / OUR PHILOSOPHY'}</T>
          </Eyebrow>
          <h2 className="section-heading mt-7 text-balance">
            <T>{'Rooted in calm.'}</T>
            <br />
            <em>
              <T>{'Crafted for slower'}</T>
            </em>{' '}
            <T>{'stays.'}</T>
          </h2>
        </div>
        <div className="max-w-[540px]">
          <p className="body-copy text-[16px]">
            {(locale === 'vi' ? hotel.data?.descriptionVi : hotel.data?.descriptionEn) || t('Dylan Grand Hotel is imagined as a quietly elegant retreat, where English charm, tactile interiors and contemporary comfort feel perfectly in step.')}
          </p>
          <p className="body-copy mt-5">
            <T>{'From leisurely breakfasts to softly lit evenings, every detail is composed to feel intuitive, restful and deeply personal.'}</T>
          </p>
          <Link href="#gallery" className="line-link mt-9">
            <T>{'EXPLORE OUR STORY'}</T> <Arrow />
          </Link>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-site">
          <SectionTitle
            index={t('02 / ROOMS & SUITES')}
            title={t('Rooms & suites')}
            italic={t('with character.')}
            action={
              <Link href="/rooms" className="line-link">
                <T>{'EXPLORE ALL ROOMS'}</T> <Arrow diagonal />
              </Link>
            }
          />
          {loading ? (
            <p className="body-copy" role="status">{t('Loading rooms…')}</p>
          ) : failed ? (
            <button type="button" className="btn-outline" onClick={reload}>{t('Unable to load rooms. Retry')}</button>
          ) : rooms.length ? (
            <RoomShowcase items={rooms} />
          ) : (
            <p className="body-copy">{t('No published rooms.')}</p>
          )}
        </div>
      </section>

      <section className="grid min-h-[540px] lg:grid-cols-2">
        <Photo src={photos.editorialExperience} alt={t('Relaxing hotel poolside setting')} className="min-h-[390px]" />
        <div className="flex flex-col justify-center bg-forest p-9 text-surface md:p-16 lg:p-24 2xl:px-28">
          <Eyebrow light>
            <T>{'03 / EXPERIENCES'}</T>
          </Eyebrow>
          <h2 className="display mt-9 section-heading text-balance">
            <T>{'Moments shaped by place.'}</T>
            <br />
            <em>
              <T>{'Seasonal, local, unhurried.'}</T>
            </em>
          </h2>
          <p className="mt-7 max-w-xl text-sm leading-8 text-surface/75 text-pretty">
            <T>{'Think garden breakfasts, restorative treatments, evening swims and small rituals that turn a stay into something memorably your own.'}</T>
          </p>
          <Link href="/experiences" className="line-link mt-10 w-fit text-surface">
            <T>{'EXPLORE EXPERIENCES'}</T> <Arrow />
          </Link>
        </div>
      </section>

      <section id="gallery" className="container-site section-pad">
        <SectionTitle index={t('04 / THE COLLECTION')} title={t('A portrait of')} italic={t('place.')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2">
          {collectionPhotos.map((photo) => (
            <Photo key={`${photo.src}-${photo.alt}`} src={photo.src} alt={t(photo.alt)} className={photo.className} />
          ))}
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-site">
          <SectionTitle index={t('05 / AMENITIES')} title={t('The little things,')} italic={t('beautifully done.')} />
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {amenities.map((item) => (
              <div className="border-t border-line pt-7" key={t(item.title)}>
                <span className="inline-flex min-h-10 items-center text-gold">
                  <Icon name={item.icon} size={34} strokeWidth={1.4} />
                </span>
                <h3 className="mt-7 font-display text-3xl">{t(item.title)}</h3>
                <p className="body-copy mt-4">{t(item.copy)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest py-20 text-surface">
        <div className="container-site flex flex-wrap items-center justify-between gap-10">
          <div>
            <Eyebrow light>
              <T>{'06 / EXCLUSIVE OFFER'}</T>
            </Eyebrow>
            <h2 className="display mt-6 section-heading text-balance">
              <T>{'Longer stays,'}</T> <em><T>{'gently rewarded.'}</T></em>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-8 text-surface/70">
              <T>{'Enjoy a more generous pace with added value for extended escapes, thoughtful inclusions and more time to settle in.'}</T>
            </p>
          </div>
          <Link href="/availability" className="btn-outline border-surface/40 text-surface">
            <T>{'DISCOVER YOUR STAY'}</T> <Arrow diagonal />
          </Link>
        </div>
      </section>

      <section className="section-pad container-site">
        <SectionTitle index={t('07 / THE JOURNAL')} title={t('Notes from')} italic={t('England.')} />
        <div className="grid gap-8 lg:grid-cols-3">
          {journalEntries.map((entry) => (
            <article key={entry.name} className="group">
              <Photo src={entry.img} alt={entry.name} className="aspect-[4/3]" />
              <div className="mt-6">
                <Eyebrow>{entry.tag}</Eyebrow>
                <h3 className="mt-3 font-display text-[clamp(2rem,2.6vw,2.75rem)] leading-tight">{t(entry.name)}</h3>
                <p className="body-copy mt-2">{t(entry.copy)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-pad border-t border-line bg-paper">
        <div className="container-site grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>
              <T>{'08 / BEFORE YOU ARRIVE'}</T>
            </Eyebrow>
            <h2 className="section-heading mt-6 text-balance">
              <T>{'Good to'}</T> <em><T>{'know.'}</T></em>
            </h2>
            <p className="body-copy mt-6 max-w-md">
              <T>{'Everything you need for a smoother arrival, a more personal stay and a little added peace of mind.'}</T>
            </p>
          </div>
          <div>
            {faqs.map((item, i) => (
              <div className="border-b border-line" key={t(item.question)}>
                <button
                  onClick={() => setFaq(faq === i ? null : i)}
                  aria-expanded={faq === i}
                  className="flex w-full justify-between gap-4 py-6 text-left text-sm font-medium"
                >
                  {t(item.question)}
                  <span className="text-xl text-gold">
                    <Icon name={faq === i ? 'minus' : 'plus'} size={20} />
                  </span>
                </button>
                {faq === i && <p className="body-copy pb-6">{t(item.answer)}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

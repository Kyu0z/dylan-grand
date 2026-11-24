'use client';
import { T, useI18n } from '@/components/language-provider';
import { SelectField } from '@/components/form-controls';
import Link from 'next/link';
import { useState, useEffect, type FormEvent } from 'react';
import { photos, services, money, rooms } from '@/lib/data';
import { getReviews, getWishlist, write } from '@/lib/storage';
import { Photo, PageIntro, Eyebrow, SectionTitle, Arrow } from '@/components/ui';
import { Icon } from '@/components/icons';
type Review = { name: string; rating: number; message: string; createdAt: string; };
const starters: Review[] = [{
  name: 'A guest perspective',
  rating: 5,
  message: 'A peaceful setting and thoughtful hospitality.',
  createdAt: 'Sample review'
}, {
  name: "A traveler's note",
  rating: 5,
  message: 'Warm textures, gentle light and spaces designed to slow the day down.',
  createdAt: 'Sample review'
}];
export default function ExperiencesPage() {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>(starters),
    [reviewOpen, setReviewOpen] = useState(false),
    [chatOpen, setChatOpen] = useState(false),
    [rating, setRating] = useState(5),
    [reviewName, setReviewName] = useState(''),
    [reviewMessage, setReviewMessage] = useState(''),
    [contact, setContact] = useState({ name: '', email: '', topic: 'General enquiry', message: '' }),
    [contactStatus, setContactStatus] = useState(''),
    [wish, setWish] = useState<string[]>([]),
    [thread, setThread] = useState<{ from: 'guest' | 'concierge'; text: string; }[]>([{
      from: 'concierge',
      text: 'Welcome to the Dylan Grand concierge guide. Ask about rooms, booking or experiences.'
    }]),
    [draft, setDraft] = useState('');
  useEffect(() => {
    setReviews([...getReviews(), ...starters]);
    setWish(getWishlist());
  }, []);
  const submitReview = (e: FormEvent) => {
    e.preventDefault();
    const next = { name: reviewName.trim(), rating, message: reviewMessage.trim(), createdAt: new Date().toISOString().slice(0, 10) };
    write('reviews', [next, ...getReviews()]);
    setReviews(s => [next, ...s]);
    setReviewOpen(false);
    setReviewName('');
    setReviewMessage('');
  };
  const reply = (text: string) => {
    const q = text.toLowerCase();
    return q.includes('room')
      ? 'Explore Deluxe, Premier and Grand Suite in Rooms & Suites.'
      : q.includes('book') || q.includes('reserve')
        ? 'Explore room options under Check Availability. Live booking is not connected yet.'
        : q.includes('spa') || q.includes('wellness')
          ? 'Explore wellness options under Experiences. Online appointments are not available yet.'
          : 'Browse our rooms and experiences to plan your stay.';
  };
  const chat = (text: string) => {
    if (!text.trim()) return;
    setThread(s => [...s, { from: 'guest', text }, { from: 'concierge', text: reply(text) }]);
    setDraft('');
  };
  return <>
    <PageIntro crumb={t("EXPERIENCES & SERVICES")}
      title={t("Stay a little")}
      italic={t("longer.")}
      description={t("A collection of moments designed to be savoured, from the smallest rituals to days worth remembering.")}
    />
    <section className="grid lg:grid-cols-[55%_45%]">
      <Photo src={photos.pool} alt={t("Resort-style hotel pool")} className="min-h-[390px]" />
      <div className="flex flex-col justify-center bg-forest p-9 text-surface md:p-17">
        <Eyebrow light><T>{"AN INVITATION TO SLOW DOWN"}</T></Eyebrow>
        <h2 className="display mt-7 text-6xl"><T>{"Made for"}</T>{ " " }<em><T>{"the moment."}</T></em></h2>
        <p className="mt-6 text-sm leading-8 text-surface/70"><T>{"Considered details, thoughtful hospitality and the freedom to enjoy your stay your way."}</T></p>
      </div>
    </section>
    <section id="services" className="container-site section-pad">
      <SectionTitle index={t("01 / EXPERIENCES")} title={t("A little space to")} italic={t("simply be.")} />
      <div className="grid gap-8 md:grid-cols-2">
        {services.map(s => <article className="group border border-line bg-paper" key={s.id}>
          <Photo src={s.image} alt={`${t(s.title)} hotel experience`} className="aspect-[16/9]" />
          <div className="p-7">
            <Eyebrow>
              {t(s.category)}
            </Eyebrow>
            <h3 className="font-display mt-3 text-4xl">
              {t(s.title)}
            </h3>
            <p className="body-copy mt-4">
              {t(s.description)}
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-line pt-5 text-xs">
              <span>
                {s.price ? `${t('Illustrative from')} ${money(s.price)}` : t('Included amenity preview')}
              </span>
              <Link href="/booking" className="line-link"><T>{"VIEW IN BOOKING"}</T>{ " " }<Arrow /></Link>
            </div>
          </div>
        </article>)}
      </div>
    </section>
    <section className="section-pad bg-paper">
      <div className="container-site">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow><T>{"02 / GUEST PERSPECTIVES"}</T></Eyebrow>
            <h2 className="section-heading mt-5"><T>{"Memories worth"}</T>{ " " }<em><T>{"sharing."}</T></em></h2>
          </div>
          <button className="btn-outline" onClick={() => setReviewOpen(true)}><T>{"WRITE A REVIEW"}</T>{ " " }<Arrow /></button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => <article className="border border-line bg-surface p-8" key={`${t(r.name)}-${i}`}>
            <span className="text-xl tracking-[.3em] text-gold">
              {Array.from({ length: r.rating }, (_, star) => <Icon key={star} name="star" filled size={17} className="inline-block mr-1" />)}
            </span>
            <p className="font-display mt-6 text-3xl leading-9">“{t(r.message)}”</p>
            <div className="mt-9 border-t border-line pt-5">
              <strong className="text-sm">
                {t(r.name)}
              </strong>
              <p className="mt-1 text-xs text-muted">
                {t(r.createdAt)}
              </p>
            </div>
          </article>)}
        </div>
      </div>
    </section>
    <section className="container-site section-pad">
      <SectionTitle index={t("03 / YOUR SAVED ROOMS")} title={t("Spaces to")} italic={t("remember.")} />
      <div className="grid gap-8 md:grid-cols-3">
        {rooms.filter(r => wish.includes(r.id)).map(r => <Link key={r.id} href={`/rooms?room=${r.id}`}>
          <Photo src={r.images[0]} alt={t(r.name)} className="aspect-[4/3]" />
          <h3 className="font-display mt-5 text-3xl">
            {t(r.name)}
          </h3>
        </Link>)}
        {!wish.length && <div className="border border-line p-8 md:col-span-3">
          <p className="body-copy"><T>{"You haven't saved any rooms yet. Tap a heart on the Rooms page to create your wishlist."}</T></p>
          <Link href="/rooms" className="line-link mt-5"><T>{"EXPLORE ROOMS →"}</T></Link>
        </div>}
      </div>
    </section>
    <section id="contact" className="section-pad bg-paper">
      <div className="container-site grid gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow><T>{"04 / LET'S CONNECT"}</T></Eyebrow>
          <h2 className="section-heading mt-6"><T>{"We'd love to"}</T>{ " " }<em><T>{"hear from you."}</T></em></h2>
          <p className="body-copy mt-6 max-w-lg"><T>{"Explore your stay with our concierge guide."}</T></p>
          <Photo src={photos.lobby} alt={t("Hotel reception lobby")} className="mt-10 aspect-[16/9]" />
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          setContactStatus('Enquiry not sent. Online contact is not connected yet.');
        }}
          className="grid content-start gap-5"
        >
          <label>
            <span className="field-label"><T>{"YOUR NAME"}</T></span>
            <input className="field-control"
              required
              value={contact.name}
              onChange={e => setContact(s => ({ ...s, name: e.target.value }))}
            />
          </label>
          <label>
            <span className="field-label"><T>{"EMAIL ADDRESS"}</T></span>
            <input className="field-control"
              type="email"
              required
              value={contact.email}
              onChange={e => setContact(s => ({ ...s, email: e.target.value }))}
            />
          </label>
          <SelectField label={t("SUBJECT")}
            value={String(contact.topic)}
            options={['General enquiry', 'Reservation enquiry', 'Experiences'].map((topic) => ({ value: topic, label: topic }))}
            onValueChange={(value) => setContact((previous) => ({ ...previous, topic: value }))}
          />
          <label>
            <span className="field-label"><T>{"MESSAGE"}</T></span>
            <textarea required
              className="field-control min-h-40"
              value={contact.message}
              onChange={e => setContact(s => ({ ...s, message: e.target.value }))}
            />
          </label>
          <button type="submit" className="btn-primary"><T>{"SEND ENQUIRY"}</T>{ " " }<Arrow /></button>
          {contactStatus && <p role="status" className="text-sm text-muted">
            {t(contactStatus)}
          </p>}
        </form>
      </div>
    </section>
    <button className="fixed bottom-6 left-6 z-40 border border-gold bg-forest px-5 py-4 text-[10px] tracking-wider text-surface uppercase shadow-xl"
      onClick={() => setChatOpen(v => !v)}
      aria-expanded={chatOpen}
    ><Icon name="sparkle" size={15} className="inline-block mr-2 align-middle" />{t('✦ CONCIERGE').replace(/^✦\s*/, '')}</button>
    {chatOpen && <section role="dialog"
      aria-label={t("Concierge guide")}
      className="fixed bottom-24 left-5 z-50 flex h-[480px] max-h-[70vh] w-[min(390px,calc(100vw-40px))] flex-col border border-line bg-paper shadow-2xl"
    >
      <div className="flex items-center justify-between bg-forest p-5 text-surface">
        <strong className="font-display text-2xl"><T>{"Dylan Concierge"}</T></strong>
        <button aria-label={t("Close chat")} onClick={() => setChatOpen(false)} className="text-2xl"><Icon name="close" size={20} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {thread.map((m, i) => <p key={i}
          className={`max-w-[90%] rounded p-3 text-xs leading-6 ${m.from === 'guest' ? 'ml-auto bg-forest text-surface' : 'bg-surface-alt text-ink'}`}
        >
          {m.from === 'concierge' ? t(m.text) : m.text}
        </p>)}
      </div>
      <form onSubmit={e => {
        e.preventDefault();
        chat(draft);
      }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input className="field-control"
          aria-label={t("Chat message")}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={t("Ask about your stay…")}
        />
        <button className="btn-primary px-4" type="submit" aria-label={t("Send message")}><Icon name="arrow-right" size={18} /></button>
      </form>
      <p className="px-3 pb-3 text-[10px] text-muted"><T>{"Scripted responses only. Not a real concierge."}</T></p>
    </section>}
    {reviewOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-overlay p-4">
      <form onSubmit={submitReview}
        role="dialog"
        aria-modal="true"
        aria-label={t("Add review")}
        className="w-full max-w-xl bg-paper p-7 md:p-10"
      >
        <div className="flex justify-between">
          <h2 className="font-display text-5xl"><T>{"Share your thoughts."}</T></h2>
          <button type="button" onClick={() => setReviewOpen(false)} className="text-3xl" aria-label={t("Close")}><Icon name="close" size={22} /></button>
        </div>
        <p className="body-copy mt-3"><T>{"Reviews are saved on this device."}</T></p>
        <div className="mt-7 grid gap-5">
          <label>
            <span className="field-label"><T>{"NAME"}</T></span>
            <input className="field-control"
              required
              value={reviewName}
              onChange={e => setReviewName(e.target.value)}
            />
          </label>
          <SelectField label={t("RATING")}
            value={String(rating)}
            options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'star' : 'stars'}` }))}
            onValueChange={(value) => setRating(Number(value))}
          />
          <label>
            <span className="field-label"><T>{"YOUR REVIEW"}</T></span>
            <textarea required
              minLength={10}
              className="field-control min-h-28"
              value={reviewMessage}
              onChange={e => setReviewMessage(e.target.value)}
            />
          </label>
          <button className="btn-primary"><T>{"SAVE REVIEW"}</T>{ " " }<Arrow /></button>
        </div>
      </form>
    </div>}
  </>;
}

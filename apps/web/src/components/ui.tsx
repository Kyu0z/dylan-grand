'use client';

import { T, useI18n } from '@/components/language-provider';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { money, rooms, type Room } from '@/lib/data';
import { getWishlist, toggleWishlist } from '@/lib/storage';

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
      <Icon name={diagonal ? 'arrow-up-right' : 'arrow-right'} size={15} />
    </span>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  const { t } = useI18n();
  return <span className={`eyebrow ${light ? 'text-gold' : 'text-muted'}`}>{typeof children === 'string' ? t(children) : children}</span>;
}

export function Photo({
  src,
  alt,
  className = '',
  priority = false
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`photo-frame group ${className}`}>
      <img className="photo-img" src={src} alt={t(alt)} loading={priority ? 'eager' : 'lazy'} />
    </div>
  );
}

export function RoomCard({ room, compact = false }: { room: Room; compact?: boolean }) {
  const { t } = useI18n();
  const [liked, setLiked] = useState(false);

  useEffect(() => setLiked(getWishlist().includes(room.id)), [room.id]);

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-line bg-paper shadow-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="relative">
        <Link href={`/rooms?room=${room.id}`}>
          <Photo src={room.images[0]} alt={`${t(room.name)} hotel bedroom`} className={compact ? 'aspect-[5/4]' : 'aspect-[4/3]'} />
        </Link>
        <button
          type="button"
          aria-label={liked ? t('Remove from wishlist') : t('Add to wishlist')}
          aria-pressed={liked}
          onClick={() => {
            setLiked(toggleWishlist(room.id).includes(room.id));
          }}
          className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-paper text-xl text-ink shadow-md"
        >
          <Icon name="heart" filled={liked} size={20} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-1 py-6">
        <Eyebrow>
          {t(room.subtitle)} · {room.size} <T>{'m²'}</T>
        </Eyebrow>
        <Link href={`/rooms?room=${room.id}`} className="font-display text-[36px] leading-[1.1] hover:text-forest xl:text-[40px]">
          {t(room.name)}
        </Link>
        <p className="body-copy line-clamp-3">{t(room.description)}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
          <div>
            <span className="block text-[10px] tracking-widest text-muted uppercase">
              <T>{'from / night'}</T>
            </span>
            <strong className="text-base font-medium">{money(room.price)}</strong>
          </div>
          <Link className="line-link" href={`/availability?room=${room.id}`}>
            <T>{'RESERVE'}</T> <Arrow />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function RoomShowcase({ items = rooms }: { items?: Room[] }) {
  const { t } = useI18n();
  const total = items.length;
  const [start, setStart] = useState(0);

  const visible = useMemo(() => {
    if (total <= 3) return items;
    return Array.from({ length: 3 }, (_, index) => items[(start + index) % total]);
  }, [items, start, total]);

  const next = () => setStart((current) => (current + 1) % total);
  const previous = () => setStart((current) => (current - 1 + total) % total);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs tracking-[0.08em] text-muted uppercase">
          <T>{'Three carefully selected room types are shown at a time.'}</T>
        </p>
        {total > 3 && (
          <div className="flex items-center gap-3">
            <button type="button" className="carousel-nav" onClick={previous} aria-label={t('Previous rooms')}>
              <Icon name="arrow-left" size={16} />
            </button>
            <button type="button" className="carousel-nav" onClick={next} aria-label={t('Next rooms')}>
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((room) => (
          <RoomCard key={`${room.id}-${start}`} room={room} />
        ))}
      </div>
    </div>
  );
}

export function RoomDetail({ room, onClose }: { room: Room; onClose: () => void }) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/60 p-0 md:p-5"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-label={t(room.name)} className="animate-in h-full w-full max-w-[740px] overflow-y-auto bg-paper shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-6 py-5">
          <Eyebrow>
            <T>{'ROOMS & SUITES /'}</T> {t(room.subtitle)}
          </Eyebrow>
          <button className="text-2xl" onClick={onClose} aria-label={t('Close room detail')}>
            <Icon name="close" size={19} />
          </button>
        </div>
        <div className="p-6 md:p-10">
          <Photo src={room.images[photo]} alt={`${t(room.name)} gallery image ${photo + 1}`} className="aspect-[16/10]" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {room.images.map((src, i) => (
              <button onClick={() => setPhoto(i)} className={`aspect-[4/3] overflow-hidden border-2 ${i === photo ? 'border-gold' : 'border-transparent'}`} key={src}>
                <img src={src} alt={`${t('View')} ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <h2 className="display mt-10 text-6xl">{t(room.name)}</h2>
          <p className="body-copy mt-4">{t(room.description)}</p>
          <div className="my-7 grid grid-cols-2 gap-4 border-y border-line py-6 text-sm">
            <span>
              {room.size} <T>{'m²'}</T>
            </span>
            <span>
              <T>{'Up to'}</T> {room.guests} <T>{'guests'}</T>
            </span>
            <span>{t(room.beds)}</span>
            <span>{t(room.view)}</span>
          </div>
          <Eyebrow>
            <T>{'IN-ROOM AMENITIES'}</T>
          </Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
            {room.amenities.map((x) => (
              <span key={x}>
                <Icon name="check" size={14} className="inline-block mr-1 align-middle text-gold" />
                {t(x)}
              </span>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
            <strong>
              {money(room.price)} <T>{'/ night'}</T>
            </strong>
            <Link href={`/availability?room=${room.id}`} className="btn-primary">
              <T>{'CHECK AVAILABILITY'}</T> <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RoomsGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {rooms.slice(0, count).map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
}

export function SectionTitle({ index, title, italic, action }: { index: string; title: string; italic?: string; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-7">
      <div>
        <Eyebrow>{t(index)}</Eyebrow>
        <h2 className="section-heading mt-5 text-balance">
          {t(title)} {italic && <em>{t(italic)}</em>}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function PageIntro({ crumb, title, italic, description }: { crumb: string; title: string; italic: string; description: string }) {
  const { t } = useI18n();
  return (
    <section className="container-site pb-14 pt-17 md:pb-20 md:pt-24">
      <Eyebrow>
        <T>{'THE HOTEL /'}</T> {t(crumb)}
      </Eyebrow>
      <h1 className="section-heading mt-8 max-w-[900px] animate-in text-balance">
        {t(title)} <em>{t(italic)}</em>
      </h1>
      <p className="body-copy mt-6 max-w-[620px] animate-in animate-delay">{t(description)}</p>
    </section>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return <p className="border-l-2 border-gold bg-surface-alt px-5 py-4 text-xs leading-7 text-muted">{children}</p>;
}

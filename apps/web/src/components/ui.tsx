'use client';
import { T, useI18n } from '@/components/language-provider';
import { useEffect, useState, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { useRooms, useWishlist } from '@/lib/live-data';
import { money, type Room } from '@/lib/data';
export function Arrow({ diagonal = false }: { diagonal?: boolean; }) {
  return <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
    <Icon name={diagonal ? 'arrow-up-right' : 'arrow-right'} size={15} />
  </span>;
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean; }) {
  const { t } = useI18n();
  return <span className={`eyebrow ${light ? 'text-gold' : 'text-muted'}`}>
    {typeof children === 'string' ? t(children) : children}
  </span>;
}
export function Photo({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean; }) {
  const { t } = useI18n();
  return <div className={`photo-frame group ${className}`}>
    <img className="photo-img" src={src} alt={t(alt)} loading={priority ? 'eager' : 'lazy'} />
  </div>;
}
export function RoomCard({ room, compact = false, onOpen }: { room: Room; compact?: boolean; onOpen?: (room: Room) => void; }) {
  const { t } = useI18n();
  const wishlist = useWishlist();
  const liked = wishlist.codes.includes(room.id);
  const handleOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(room);
  };
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden border border-line bg-paper">
    <div className="relative">
      <Link href={`/rooms?room=${encodeURIComponent(room.id)}`} scroll={false} onClick={handleOpen}>
        <Photo src={room.images[0]}
          alt={`${t(room.name)} hotel bedroom`}
          className={compact ? 'aspect-[5/4]' : 'aspect-[4/3]'}
        />
      </Link>
      <button type="button"
        aria-label={liked ? t('Remove from wishlist') : t('Add to wishlist')}
        aria-pressed={liked}
        disabled={wishlist.loading || wishlist.failed}
        onClick={() => {
          void wishlist.toggle(room.id).catch(() => { });
        }}
        className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-paper text-xl text-ink shadow-md"
      >
        <Icon name="heart" filled={liked} size={20} />
      </button>
    </div>
    <div className="flex flex-1 flex-col gap-3 px-2 py-6">
      <Eyebrow>{t(room.subtitle)} {room.size > 0 && <>· {room.size} <T>{"m²"}</T></>}</Eyebrow>
      <Link href={`/rooms?room=${encodeURIComponent(room.id)}`} scroll={false} onClick={handleOpen}
        className="font-display text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.15] break-words hover:text-forest"
      >
        {t(room.name)}
      </Link>
      <p className="body-copy line-clamp-2">
        {t(room.description)}
      </p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
        <div>
          <span className="block text-[10px] tracking-widest text-muted uppercase"><T>{"from / night"}</T></span>
          <strong className="text-base font-medium">
            {money(room.price)}
          </strong>
        </div>
        <Link className="line-link" href={`/availability?room=${room.id}`}><T>{"RESERVE"}</T>{" "}<Arrow /></Link>
      </div>
    </div>
  </article>;
}
export function RoomDetail({ room, onClose }: { room: Room; onClose: () => void; }) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState(0);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);
  return <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 p-0 md:p-5"
    role="presentation"
    onMouseDown={e => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <section role="dialog"
      aria-modal="true"
      aria-label={t(room.name)}
      className="h-full w-full max-w-[740px] overflow-y-auto bg-paper shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-6 py-5">
        <Eyebrow><T>{"ROOMS & SUITES /"}</T>{" "}{t(room.subtitle)}</Eyebrow>
        <button className="text-2xl" onClick={onClose} aria-label={t("Close room detail")}><Icon name="close" size={19} /></button>
      </div>
      <div className="p-6 md:p-10">
        <Photo src={room.images[photo]}
          alt={`${t(room.name)} gallery image ${photo + 1}`}
          className="aspect-[16/10]"
        />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {room.images.map((src, i) => <button onClick={() => setPhoto(i)}
            className={`aspect-[4/3] overflow-hidden border-2 ${i === photo ? 'border-gold' : 'border-transparent'}`}
            key={src}
          >
            <img src={src} alt={`${t("View")} ${i + 1}`} className="h-full w-full object-cover" />
          </button>)}
        </div>
        <h2 className="display mt-10 text-6xl">
          {t(room.name)}
        </h2>
        <p className="body-copy mt-4">
          {t(room.description)}
        </p>
        <div className="my-7 grid grid-cols-2 gap-4 border-y border-line py-6 text-sm">
          {room.size > 0 && <span>{room.size} <T>{"m²"}</T></span>}
          <span><T>{"Up to"}</T>{" "}{room.guests} <T>{"guests"}</T></span>
          <span>
            {t(room.beds)}
          </span>
          <span>
            {t(room.view)}
          </span>
        </div>
        <Eyebrow><T>{"IN-ROOM AMENITIES"}</T></Eyebrow>
        <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
          {room.amenities.map(x => <span key={x}><Icon name="check" size={14} className="inline-block align-middle mr-1 text-gold" />{t(x)}</span>)}
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <strong>{money(room.price)} <T>{"/ night"}</T></strong>
          <Link href={`/availability?room=${room.id}`} className="btn-primary"><T>{"CHECK AVAILABILITY"}</T>{" "}<Arrow /></Link>
        </div>
      </div>
    </section>
  </div>;
}
export function RoomsGrid({ count = 3 }: { count?: number; }) {
  const { rooms } = useRooms();
  return <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
    {rooms.slice(0, count).map(r => <RoomCard key={r.id} room={r} />)}
  </div>;
}
export function SectionTitle({ index, title, italic, action }: { index: string; title: string; italic?: string; action?: ReactNode; }) {
  const { t } = useI18n();
  return <div className="mb-12 flex flex-wrap items-end justify-between gap-7">
    <div>
      <Eyebrow>
        {t(index)}
      </Eyebrow>
      <h2 className="section-heading mt-5">{t(title)} {italic && <em>
        {t(italic)}
      </em>}</h2>
    </div>
    {action}
  </div>;
}
export function PageIntro({ crumb, title, italic, description }: { crumb: string; title: string; italic: string; description: string; }) {
  const { t } = useI18n();
  return <section className="container-site pb-14 pt-17 md:pb-20 md:pt-24">
    <Eyebrow><T>{"THE HOTEL /"}</T>{" "}{t(crumb)}</Eyebrow>
    <h1 className="section-heading mt-8 max-w-[900px] animate-in">{t(title)} <em>
      {t(italic)}
    </em></h1>
    <p className="body-copy mt-6 max-w-[620px] animate-in animate-delay">
      {t(description)}
    </p>
  </section>;
}
export function InfoNote({ children }: { children: ReactNode; }) {
  return <p className="border-l-2 border-gold bg-surface-alt px-5 py-4 text-xs leading-7 text-muted">
    {children}
  </p>;
}

export function RoomShowcase({ items }: { items: Room[] }) {
  const [capacity, setCapacity] = useState(3);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const tablet = window.matchMedia('(min-width: 768px)');
    const update = () => setCapacity(desktop.matches ? 3 : tablet.matches ? 2 : 1);
    update();
    desktop.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  if (!items.length) return null;
  if (items.length <= capacity) {
    return <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {items.map(room => <RoomCard key={room.id} room={room} />)}
    </div>;
  }
  // Reset animation only when the available room IDs or breakpoint actually change.
  return <SlidingRooms key={JSON.stringify([capacity, items.map(room => room.id)])} items={items} capacity={capacity} />;
}

const slideDuration = 460;
const wrapIndex = (index: number, length: number) => ((index % length) + length) % length;

function SlidingRooms({ items, capacity }: { items: Room[]; capacity: number }) {
  const { t } = useI18n();
  const [start, setStart] = useState(0);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const moving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep one buffer card at both edges. Stable absolute keys preserve overlapping cards.
  const slots = Array.from({ length: capacity + 2 }, (_, offset) => start + offset - 1);
  useEffect(() => {
    return () => { if (timer.current !== null) clearTimeout(timer.current); };
  }, []);

  function move(step: -1 | 1) {
    if (moving.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStart(value => value + step);
      return;
    }
    moving.current = true;
    setDirection(step);
    timer.current = setTimeout(() => {
      setStart(value => value + step);
      setDirection(0);
      moving.current = false;
      timer.current = null;
    }, slideDuration);
  }

  const style = { '--room-capacity': capacity, '--room-offset': 1 + direction, '--room-duration': `${slideDuration}ms` } as CSSProperties;
  return <div className="room-showcase" style={style}>
    <div className="mb-6 flex justify-end gap-3">
      <button type="button" className="carousel-nav" aria-label={t('Previous rooms')} aria-disabled={direction !== 0} onClick={() => move(-1)}>
        <Icon name="arrow-left" size={18} />
      </button>
      <button type="button" className="carousel-nav" aria-label={t('Next rooms')} aria-disabled={direction !== 0} onClick={() => move(1)}>
        <Icon name="arrow-right" size={18} />
      </button>
    </div>
    <div className="room-showcase-viewport">
      <div className="room-showcase-track" data-sliding={direction !== 0}>
        {slots.map((slot, offset) => {
          const room = items[wrapIndex(slot, items.length)];
          const hidden = offset === 0 || offset === capacity + 1;
          return <div className="room-showcase-card" key={slot} inert={hidden} aria-hidden={hidden || undefined}>
            <RoomCard room={room} />
          </div>;
        })}
      </div>
    </div>
    <span className="sr-only" aria-live="polite">{items[wrapIndex(start, items.length)].name}</span>
  </div>;
}

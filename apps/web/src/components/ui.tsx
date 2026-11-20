'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { money, rooms, type Room } from '@/lib/data';
import { getWishlist, toggleWishlist } from '@/lib/storage';
export function Arrow({ diagonal = false }: { diagonal?: boolean; }) {
  return <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
    {diagonal ? '↗' : '→'}
  </span>;
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean; }) {
  return <span className={`eyebrow ${light ? 'text-gold' : 'text-muted'}`}>
    {children}
  </span>;
}
export function Photo({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean; }) {
  return <div className={`photo-frame group ${className}`}>
    <img className="photo-img" src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} />
    <span className="absolute bottom-4 left-5 bg-ink/65 px-3 py-1 text-[9px] tracking-[.14em] text-surface uppercase">Concept photography</span>
  </div>;
}
export function RoomCard({ room, compact = false }: { room: Room; compact?: boolean; }) {
  const [liked, setLiked] = useState(false);
  useEffect(() => setLiked(getWishlist().includes(room.id)), [room.id]);
  return <article className="group flex flex-col overflow-hidden bg-paper">
    <div className="relative">
      <Link href={`/rooms?room=${room.id}`}>
        <Photo src={room.images[0]}
          alt={`${room.name} hotel bedroom concept photograph`}
          className={compact ? 'aspect-[5/4]' : 'aspect-[4/3]'}
        />
      </Link>
      <button type="button"
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={liked}
        onClick={() => {
          setLiked(toggleWishlist(room.id).includes(room.id));
        }}
        className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-paper text-xl text-ink shadow-md"
      >
        {liked ? '♥' : '♡'}
      </button>
    </div>
    <div className="flex flex-1 flex-col gap-3 px-1 py-6">
      <Eyebrow>{room.subtitle} · {room.size} m²</Eyebrow>
      <Link href={`/rooms?room=${room.id}`}
        className="font-display text-[40px] leading-none hover:text-forest"
      >
        {room.name}
      </Link>
      <p className="body-copy line-clamp-2">
        {room.description}
      </p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
        <div>
          <span className="block text-[10px] tracking-widest text-muted uppercase">from / night</span>
          <strong className="text-base font-medium">
            {money(room.price)}
          </strong>
        </div>
        <Link className="line-link" href={`/availability?room=${room.id}`}>RESERVE <Arrow /></Link>
      </div>
    </div>
  </article>;
}
export function RoomDetail({ room, onClose }: { room: Room; onClose: () => void; }) {
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
      aria-label={room.name}
      className="animate-in h-full w-full max-w-[740px] overflow-y-auto bg-paper shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-6 py-5">
        <Eyebrow>ROOMS & SUITES / {room.subtitle}</Eyebrow>
        <button className="text-2xl" onClick={onClose} aria-label="Close room detail">×</button>
      </div>
      <div className="p-6 md:p-10">
        <Photo src={room.images[photo]}
          alt={`${room.name} gallery image ${photo + 1}`}
          className="aspect-[16/10]"
        />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {room.images.map((src, i) => <button onClick={() => setPhoto(i)}
            className={`aspect-[4/3] overflow-hidden border-2 ${i === photo ? 'border-gold' : 'border-transparent'}`}
            key={src}
          >
            <img src={src} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
          </button>)}
        </div>
        <h2 className="display mt-10 text-6xl">
          {room.name}
        </h2>
        <p className="body-copy mt-4">
          {room.description}
        </p>
        <div className="my-7 grid grid-cols-2 gap-4 border-y border-line py-6 text-sm">
          <span>{room.size} m²</span>
          <span>Up to {room.guests} guests</span>
          <span>
            {room.beds}
          </span>
          <span>
            {room.view}
          </span>
        </div>
        <Eyebrow>IN-ROOM AMENITIES</Eyebrow>
        <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
          {room.amenities.map(x => <span key={x}>✓ &nbsp;{x}</span>)}
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
          <strong>{money(room.price)} / night</strong>
          <Link href={`/availability?room=${room.id}`} className="btn-primary">CHECK AVAILABILITY <Arrow /></Link>
        </div>
      </div>
    </section>
  </div>;
}
export function RoomsGrid({ count = 3 }: { count?: number; }) {
  return <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
    {rooms.slice(0, count).map(r => <RoomCard key={r.id} room={r} />)}
  </div>;
}
export function SectionTitle({ index, title, italic, action }: { index: string; title: string; italic?: string; action?: ReactNode; }) {
  return <div className="mb-12 flex flex-wrap items-end justify-between gap-7">
    <div>
      <Eyebrow>
        {index}
      </Eyebrow>
      <h2 className="section-heading mt-5">{title} {italic && <em>
        {italic}
      </em>}</h2>
    </div>
    {action}
  </div>;
}
export function PageIntro({ crumb, title, italic, description }: { crumb: string; title: string; italic: string; description: string; }) {
  return <section className="container-site pb-14 pt-17 md:pb-20 md:pt-24">
    <Eyebrow>THE HOTEL / {crumb}</Eyebrow>
    <h1 className="section-heading mt-8 max-w-[900px] animate-in">{title} <em>
      {italic}
    </em></h1>
    <p className="body-copy mt-6 max-w-[620px] animate-in animate-delay">
      {description}
    </p>
  </section>;
}
export function InfoNote({ children }: { children: ReactNode; }) {
  return <p className="border-l-2 border-gold bg-surface-alt px-5 py-4 text-xs leading-7 text-muted">
    {children}
  </p>;
}

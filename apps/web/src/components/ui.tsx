
'use client';

import { T, useI18n } from '@/components/language-provider';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { useRooms, useWishlist } from '@/lib/live-data';
import { money, type Room } from '@/lib/data';

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block transition-transform group-hover:translate-x-1"
    >
      <Icon
        name={diagonal ? 'arrow-up-right' : 'arrow-right'}
        size={15}
      />
    </span>
  );
}

export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  const { t } = useI18n();

  return (
    <span
      className={`eyebrow ${light ? 'text-gold' : 'text-muted'}`}
    >
      {typeof children === 'string' ? t(children) : children}
    </span>
  );
}

export function Photo({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={`photo-frame group ${className}`}>
      <img
        className="photo-img"
        src={src}
        alt={t(alt)}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

export function RoomCard({
  room,
  compact = false,
  onOpen,
}: {
  room: Room;
  compact?: boolean;
  onOpen?: (room: Room) => void;
}) {
  const { t } = useI18n();
  const wishlist = useWishlist();
  const liked = wishlist.codes.includes(room.id);

  const [detailOpen, setDetailOpen] = useState(false);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const detailHref = `/rooms?room=${encodeURIComponent(room.id)}`;

  function openDetail(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    if (onOpen) {
      onOpen(room);
    } else {
      setDetailOpen(true);
    }
  }

  return (
    <>
      <article className="group flex flex-col overflow-hidden border border-line bg-paper">
        <div className="relative">
          <Link
            href={detailHref}
            onClick={openDetail}
            scroll={false}
            aria-haspopup="dialog"
            className="block"
          >
            <Photo
              src={room.images[0]}
              alt={`${t(room.name)} hotel bedroom`}
              className={
                compact ? 'aspect-[5/4]' : 'aspect-[4/3]'
              }
            />
          </Link>

          <button
            type="button"
            aria-label={
              liked
                ? t('Remove from wishlist')
                : t('Add to wishlist')
            }
            aria-pressed={liked}
            disabled={wishlist.loading || wishlist.failed}
            onClick={() => {
              void wishlist.toggle(room.id).catch(() => {});
            }}
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-paper text-xl text-ink shadow-md"
          >
            <Icon name="heart" filled={liked} size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-[8px] py-6">
          <Eyebrow>
            {t(room.subtitle)}{' '}
            {room.size > 0 && (
              <>
                · {room.size} <T>{'m²'}</T>
              </>
            )}
          </Eyebrow>

          <Link
            href={detailHref}
            onClick={openDetail}
            scroll={false}
            aria-haspopup="dialog"
            className="font-display text-[40px] leading-[1.15] hover:text-forest"
          >
            {t(room.name)}
          </Link>

          <p className="body-copy line-clamp-2">
            {t(room.description)}
          </p>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
            <div>
              <span className="block text-[10px] tracking-widest text-muted uppercase">
                <T>{'from / night'}</T>
              </span>

              <strong className="text-base font-medium">
                {money(room.price)}
              </strong>
            </div>

            <Link
              className="line-link"
              href={`/availability?room=${room.id}`}
            >
              <T>{'RESERVE'}</T> <Arrow />
            </Link>
          </div>
        </div>
      </article>

      {!onOpen && detailOpen && (
        <RoomDetail
          room={room}
          onClose={closeDetail}
        />
      )}
    </>
  );
}

export function RoomDetail({
  room,
  onClose,
}: {
  room: Room;
  onClose: () => void;
}) {
  const { t } = useI18n();

  const [photo, setPhoto] = useState(0);

  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const previousFocus = document.activeElement;
    const pathname = window.location.pathname;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const rootOverflow = root.style.overflowY;
    const bodyOverflow = body.style.overflowY;
    const scrollbarGutter = root.style.scrollbarGutter;

    if (window.innerWidth > root.clientWidth) {
      root.style.scrollbarGutter = 'stable';
    }

    root.style.overflowY = 'hidden';
    body.style.overflowY = 'hidden';

    closeRef.current?.focus({
      preventScroll: true,
    });

    return () => {
      root.style.overflowY = rootOverflow;
      body.style.overflowY = bodyOverflow;
      root.style.scrollbarGutter = scrollbarGutter;

      if (window.location.pathname !== pathname) {
        return;
      }

      if (
        window.scrollX !== scrollX ||
        window.scrollY !== scrollY
      ) {
        window.scrollTo({
          left: scrollX,
          top: scrollY,
          behavior: 'instant',
        });
      }

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({
          preventScroll: true,
        });
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (
          active === first ||
          !dialogRef.current?.contains(active)
        )
      ) {
        event.preventDefault();

        last.focus({
          preventScroll: true,
        });
      } else if (
        !event.shiftKey &&
        (
          active === last ||
          !dialogRef.current?.contains(active)
        )
      ) {
        event.preventDefault();

        first.focus({
          preventScroll: true,
        });
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/60 p-0 md:p-5"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(room.name)}
        className="h-full w-full max-w-[740px] overflow-y-auto overscroll-contain bg-paper shadow-2xl motion-safe:animate-[fadeUp_150ms_ease-out_both]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-6 py-5">
          <Eyebrow>
            <T>{'ROOMS & SUITES /'}</T>{' '}
            {t(room.subtitle)}
          </Eyebrow>

          <button
            ref={closeRef}
            type="button"
            className="text-2xl"
            onClick={onClose}
            aria-label={t('Close room detail')}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="p-6 md:p-10">
          <Photo
            src={room.images[photo] ?? room.images[0]}
            alt={`${t(room.name)} gallery image ${photo + 1}`}
            className="aspect-[16/10]"
            priority
          />

          <div className="mt-3 grid grid-cols-3 gap-3">
            {room.images.map((src, i) => (
              <button
                key={`${i}-${src}`}
                type="button"
                onClick={() => setPhoto(i)}
                aria-pressed={i === photo}
                className={`aspect-[4/3] overflow-hidden border-2 ${
                  i === photo
                    ? 'border-gold'
                    : 'border-transparent'
                }`}
              >
                <img
                  src={src}
                  alt={`${t('View')} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <h2 className="display mt-10 text-6xl">
            {t(room.name)}
          </h2>

          <p className="body-copy mt-4">
            {t(room.description)}
          </p>

          <div className="my-7 grid grid-cols-2 gap-4 border-y border-line py-6 text-sm">
            {room.size > 0 && (
              <span>
                {room.size} <T>{'m²'}</T>
              </span>
            )}

            <span>
              <T>{'Up to'}</T> {room.guests}{' '}
              <T>{'guests'}</T>
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
                <Icon
                  name="check"
                  size={14}
                  className="inline-block align-middle mr-1 text-gold"
                />
                {t(x)}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
            <strong>
              {money(room.price)} <T>{'/ night'}</T>
            </strong>

            <Link
              href={`/availability?room=${room.id}`}
              className="btn-primary"
            >
              <T>{'CHECK AVAILABILITY'}</T> <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function RoomsGrid({
  count = 3,
}: {
  count?: number;
}) {
  const { rooms } = useRooms();

  return (
    <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {rooms.slice(0, count).map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
}

export function SectionTitle({
  index,
  title,
  italic,
  action,
}: {
  index: string;
  title: string;
  italic?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-7">
      <div>
        <Eyebrow>{t(index)}</Eyebrow>

        <h2 className="section-heading mt-5">
          {t(title)} {italic && <em>{t(italic)}</em>}
        </h2>
      </div>

      {action}
    </div>
  );
}

export function PageIntro({
  crumb,
  title,
  italic,
  description,
}: {
  crumb: string;
  title: string;
  italic: string;
  description: string;
}) {
  const { t } = useI18n();

  return (
    <section className="container-site pb-14 pt-17 md:pb-20 md:pt-24">
      <Eyebrow>
        <T>{'THE HOTEL /'}</T> {t(crumb)}
      </Eyebrow>

      <h1 className="section-heading mt-8 max-w-[900px] animate-in">
        {t(title)} <em>{t(italic)}</em>
      </h1>

      <p className="body-copy mt-6 max-w-[620px] animate-in animate-delay">
        {t(description)}
      </p>
    </section>
  );
}

export function InfoNote({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="border-l-2 border-gold bg-surface-alt px-5 py-4 text-xs leading-7 text-muted">
      {children}
    </p>
  );
}

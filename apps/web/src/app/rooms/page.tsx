
'use client';

import { Icon } from '@/components/icons';
import { T, useI18n } from '@/components/language-provider';
import { SelectField } from '@/components/form-controls';
import {
  Suspense,
  useState,
  useEffect,
  useCallback,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  roomArtwork as artwork,
  money,
  type Room,
  type RoomId,
} from '@/lib/data';
import {
  Photo,
  PageIntro,
  Eyebrow,
  RoomCard,
  RoomDetail,
  Arrow,
} from '@/components/ui';
import { useRooms } from '@/lib/live-data';

function RoomsContent() {
  const { t } = useI18n();
  const { rooms, loading, failed, reload } = useRooms();

  const params = useSearchParams();
  const roomParam = params.get('room');

  const [selectedId, setSelectedId] =
    useState<RoomId | null>(roomParam);

  const [compare, setCompare] = useState<RoomId[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [minGuests, setMinGuests] = useState(1);
  const [view, setView] = useState('all');

  useEffect(() => {
    setSelectedId(roomParam);
  }, [roomParam]);

  const selected = rooms.find(
    (room) => room.id === selectedId,
  );

  const open = useCallback((room: Room) => {
    setSelectedId(room.id);
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);

    const url = new URL(window.location.href);

    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');

      window.history.replaceState(null, '', url);
    }
  }, []);

  const toggle = (id: RoomId) => {
    setCompare((current) => {
      if (current.includes(id)) {
        return current.filter((x) => x !== id);
      }

      return current.length >= 3
        ? current
        : [...current, id];
    });
  };

  const filtered = rooms.filter(
    (r) =>
      r.guests >= minGuests &&
      (view === 'all' || r.view === view),
  );

  return (
    <>
      <PageIntro
        crumb={t('ROOMS & SUITES')}
        title={t('Rooms for')}
        italic={t('every rhythm.')}
        description={t(
          'Intimate, thoughtfully detailed and wonderfully unhurried. Find a space that feels just right for your stay.',
        )}
      />

      <div className="grid lg:grid-cols-[58%_42%]">
        <Photo
          src={artwork[2].images[0]}
          alt={t('Grand Suite hotel bedroom')}
          className="min-h-[360px] lg:min-h-[490px]"
        />

        <div className="flex flex-col justify-center bg-forest p-9 text-surface lg:p-20">
          <Eyebrow light>
            <T>{'A ROOM OF YOUR OWN'}</T>
          </Eyebrow>

          <h2 className="display mt-7 text-6xl">
            <T>{'Made for'}</T>
            <br />
            <em>
              <T>{'staying in.'}</T>
            </em>
          </h2>

          <p className="mt-7 max-w-sm text-sm leading-8 text-surface/75">
            <T>
              {
                'Warm textures, quiet corners and considered amenities bring the Dylan Grand experience into every room.'
              }
            </T>
          </p>

          <a
            className="line-link mt-9 w-fit"
            href="#room-collection"
          >
            <T>{'EXPLORE THE COLLECTION'}</T> <Arrow />
          </a>
        </div>
      </div>

      <section
        className="section-pad container-site"
        id="room-collection"
      >
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>
              <T>{'02 / OUR ACCOMMODATIONS'}</T>
            </Eyebrow>

            <h2 className="section-heading mt-5">
              <T>{'Discover your'}</T>{' '}
              <em>
                <T>{'space.'}</T>
              </em>
            </h2>
          </div>

          <span className="text-xs text-muted">
            {filtered.length} <T>{'ROOM TYPES'}</T>
          </span>
        </div>

        <div className="mb-10 flex flex-wrap items-end gap-4 border-y border-line py-5">
          <SelectField
            label={t('GUESTS')}
            value={String(minGuests)}
            options={[1, 2, 3].map((n) => ({
              value: String(n),
              label: `${n}+ guests`,
            }))}
            onValueChange={(value) => {
              setMinGuests(Number(value));
            }}
          />

          <SelectField
            label={t('VIEW')}
            value={String(view)}
            options={[
              {
                value: 'all',
                label: 'All views',
              },
              ...Array.from(
                new Set(
                  rooms.map((r) => r.view).filter(Boolean),
                ),
              ).map((value) => ({
                value,
                label: value,
              })),
            ]}
            onValueChange={(value) => {
              setView(value);
            }}
          />

          <button
            className="btn-outline mt-5"
            onClick={() => {
              setMinGuests(1);
              setView('all');
            }}
          >
            <T>{'RESET FILTERS'}</T>
          </button>
        </div>

        {loading ? (
          <p>{t('Loading rooms…')}</p>
        ) : failed ? (
          <button
            className="btn-outline"
            onClick={reload}
          >
            {t('Unable to load rooms. Retry')}
          </button>
        ) : !filtered.length ? (
          <p>{t('No rooms in this selection.')}</p>
        ) : null}

        <div className="grid gap-9 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((room) => (
            <div key={room.id}>
              <RoomCard
                room={room}
                onOpen={open}
              />

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="text-xs font-semibold underline underline-offset-4"
                  onClick={() => open(room)}
                >
                  <T>{'VIEW ROOM GALLERY'}</T>
                </button>

                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={compare.includes(room.id)}
                    onChange={() => toggle(room.id)}
                    className="accent-gold"
                  />

                  <T>{'Compare'}</T>
                </label>
              </div>
            </div>
          ))}
        </div>

        {!filtered.length && (
          <p className="body-copy py-20 text-center">
            <T>{'No rooms match these filters.'}</T>
          </p>
        )}

        {compare.length > 0 && (
          <div className="sticky bottom-5 z-20 mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-3 border border-gold bg-paper p-4 shadow-xl">
            <span className="text-xs">
              {compare.length} <T>{'room'}</T>
              {compare.length > 1 ? 's' : ''}{' '}
              <T>{'selected'}</T>
            </span>

            <button
              className="btn-primary"
              onClick={() => setCompareOpen(true)}
            >
              <T>{'COMPARE ROOMS →'}</T>
            </button>

            <button
              className="text-xs"
              onClick={() => setCompare([])}
            >
              <T>{'Clear'}</T>
            </button>
          </div>
        )}

        <div className="mt-20 border-t border-line pt-14 text-center">
          <h3 className="font-display text-5xl">
            <T>{'Unwind, then stay awhile.'}</T>
          </h3>

          <p className="body-copy mx-auto mt-5 max-w-lg">
            <T>
              {
                'Every stay is personal. Explore availability and discover the room that feels just right.'
              }
            </T>
          </p>

          <Link
            href="/availability"
            className="btn-primary mt-8"
          >
            <T>{'CHECK AVAILABILITY'}</T> <Arrow />
          </Link>
        </div>
      </section>

      {selected && (
        <RoomDetail
          key={selected.id}
          room={selected}
          onClose={close}
        />
      )}

      {compareOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-overlay p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t('Compare rooms')}
            className="w-full max-w-4xl bg-paper p-6 md:p-10"
          >
            <div className="flex justify-between">
              <h2 className="font-display text-5xl">
                <T>{'Compare your spaces.'}</T>
              </h2>

              <button
                onClick={() => setCompareOpen(false)}
                className="text-3xl"
                aria-label={t('Close compare')}
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {rooms
                .filter((r) => compare.includes(r.id))
                .map((r) => (
                  <div
                    key={r.id}
                    className="border border-line p-3"
                  >
                    <Photo
                      src={r.images[0]}
                      alt={t(r.name)}
                      className="aspect-[4/3]"
                    />

                    <h3 className="font-display mt-4 text-3xl">
                      {t(r.name)}
                    </h3>

                    <p className="body-copy">
                      {r.size} <T>{'m² ·'}</T>{' '}
                      {r.guests} <T>{'guests ·'}</T>{' '}
                      {t(r.beds)}
                    </p>

                    <p className="mt-3 text-sm">
                      {money(r.price)}
                      <T>{'/night'}</T>
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default function RoomsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-site py-24">
          <T>{'Loading rooms…'}</T>
        </div>
      }
    >
      <RoomsContent />
    </Suspense>
  );
}

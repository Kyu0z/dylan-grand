'use client';
import { T, useI18n } from '@/components/language-provider';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type BaseControlProps = {
  label: string;
  className?: string;
  disabled?: boolean;
};

type SelectFieldProps = BaseControlProps & {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
};

type DateFieldProps = BaseControlProps & {
  value: string;
  onValueChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
};

function ChevronIcon({ direction = 'down' }: { direction?: 'down' | 'left' | 'right' }) {
  const transform = direction === 'left' ? 'rotate(90 12 12)' : direction === 'right' ? 'rotate(-90 12 12)' : undefined;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" transform={transform} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </svg>
  );
}

/** Close a popover on outside click and Escape without installing another UI dependency. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return { open, setOpen, rootRef };
}

export function SelectField({
  label,
  value,
  options,
  onValueChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
}: SelectFieldProps) {
  const id = useId();
  const { t } = useI18n();
  const { open, setOpen, rootRef } = usePopover();
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(index >= 0 ? index : Math.max(0, options.findIndex((option) => !option.disabled)));
  }, [open, options, value]);

  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const move = (direction: 1 | -1) => {
    if (!options.length) return;
    let index = activeIndex;
    for (let i = 0; i < options.length; i++) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) {
        setActiveIndex(index);
        break;
      }
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setOpen(true);
      const available = options.map((option, index) => (!option.disabled ? index : -1)).filter((index) => index >= 0);
      if (available.length) setActiveIndex(event.key === 'Home' ? available[0] : available[available.length - 1]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (options[activeIndex] && !options[activeIndex].disabled) {
        onValueChange(options[activeIndex].value);
        setOpen(false);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`lux-control relative min-w-0 ${className}`}>
      <span className="field-label" id={`${id}-label`}>{t(label)}</span>
      <button
        type="button"
        disabled={disabled}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onKeyDown={onKeyDown}
        onClick={() => setOpen((previous) => !previous)}
        className={`field-control lux-trigger flex items-center justify-between gap-3 text-left ${open ? 'lux-trigger-open' : ''}`}
      >
        <span id={`${id}-value`} className="truncate">{t(chosen?.label ?? placeholder)}</span>
        <span className={`lux-chevron shrink-0 ${open ? 'rotate-180' : ''}`}><ChevronIcon /></span>
      </button>

      {open && (
        <div className="lux-popover lux-select-popover" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { itemRefs.current[index] = element; }}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              className={`lux-option ${index === activeIndex ? 'lux-option-active' : ''} ${option.value === value ? 'lux-option-selected' : ''}`}
            >
              <span>{t(option.label)}</span>
              {option.value === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const toISO = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const fromISO = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
};

export function DateField({
  label,
  value,
  onValueChange,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  className = '',
}: DateFieldProps) {
  const { t, locale } = useI18n();
  const id = useId();
  const { open, setOpen, rootRef } = usePopover();
  const initialDate = value || minDate || '2026-01-01';
  const [visibleMonth, setVisibleMonth] = useState(() => fromISO(initialDate));
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setVisibleMonth(fromISO(value || minDate || '2026-01-01'));
  }, [open, value, minDate]);

  const monthTitle = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' }).format(visibleMonth);
  const selectedLabel = value
    ? new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(fromISO(value))
    : 'Select date';

  const days = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
    const startOffset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(1 + index - startOffset);
      return { date: toISO(date), day: date.getDate(), inMonth: date.getMonth() === first.getMonth() };
    });
  }, [visibleMonth]);

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  };
  const monthISO = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`;
  const cannotPrev = Boolean(minDate && monthISO <= minDate.slice(0, 7));
  const cannotNext = Boolean(maxDate && monthISO >= maxDate.slice(0, 7));

  return (
    <div ref={rootRef} className={`lux-control relative min-w-0 ${className}`}>
      <span className="field-label" id={`${id}-label`}>{t(label)}</span>
      <button
        type="button"
        ref={triggerRef}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        aria-required={required}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={`field-control lux-trigger flex items-center justify-between gap-3 text-left ${open ? 'lux-trigger-open' : ''}`}
      >
        <span id={`${id}-value`} className="truncate">{selectedLabel}</span>
        <CalendarIcon />
      </button>

      {open && (
        <section
          id={`${id}-calendar`}
          role="dialog"
          aria-label={`${t(label)} ${locale === 'vi' ? 'lịch' : 'calendar'}`}
          className="lux-popover lux-calendar"
        >
          <header className="mb-5 flex items-center justify-between gap-3">
            <span className="font-display text-[27px] leading-none">{monthTitle}</span>
            <div className="flex gap-1">
              <button type="button" aria-label={t("Previous month")} className="lux-month-button" disabled={cannotPrev} onClick={() => changeMonth(-1)}><ChevronIcon direction="left" /></button>
              <button type="button" aria-label={t("Next month")} className="lux-month-button" disabled={cannotNext} onClick={() => changeMonth(1)}><ChevronIcon direction="right" /></button>
            </div>
          </header>
          <div className="lux-calendar-grid mb-2" aria-hidden="true">
            {(locale === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : WEEKDAYS).map((day) => <span className="lux-weekday" key={day}>{day}</span>)}
          </div>
          <div className="lux-calendar-grid">
            {days.map(({ date, day, inMonth }) => {
              const unavailable = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
              return (
                <button
                  key={date}
                  type="button"
                  disabled={unavailable}
                  aria-label={new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'full' }).format(fromISO(date))}
                  aria-pressed={date === value}
                  className={`lux-calendar-day ${inMonth ? '' : 'lux-calendar-adjacent'} ${date === value ? 'lux-calendar-selected' : ''}`}
                  onClick={() => {
                    onValueChange(date);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] tracking-[.1em]">
            <button type="button" className="lux-calendar-link" onClick={() => setVisibleMonth(new Date())}><T>{"THIS MONTH"}</T></button>
            <button type="button" className="lux-calendar-link" onClick={() => setOpen(false)}><T>{"CLOSE"}</T></button>
          </div>
        </section>
      )}
    </div>
  );
}

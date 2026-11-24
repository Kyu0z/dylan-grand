import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'pool'
  | 'dining'
  | 'wellness'
  | 'comfort'
  | 'moon'
  | 'sun'
  | 'menu'
  | 'close'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'arrow-up'
  | 'heart'
  | 'check'
  | 'star'
  | 'plus'
  | 'minus'
  | 'sparkle'
  | 'chevron-down'
  | 'user'
  | 'bed'
  | 'log-out'
  | 'arrow-left'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off';

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  filled?: boolean;
};

/** Stable, theme-aware vector icons. No OS/browser emoji font dependencies. */
export function Icon({ name, size = 24, filled = false, ...props }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    pool: (
      <>
        <path d="M3 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
        <path d="M3 21c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
        <path d="M6 15V8a3 3 0 0 1 6 0M12 15V8a3 3 0 0 1 6 0M6 12h6" />
      </>
    ),
    dining: (
      <>
        <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 21V3c4 2 5 6 5 11h-5v7" />
      </>
    ),
    wellness: (
      <>
        <path d="M12 21c0-7 0-14 0-18" />
        <path d="M12 15c-4 0-7-3-8-7 5 0 8 3 8 7ZM12 11c4 0 7-3 8-7-5 0-8 3-8 7Z" />
        <path d="M7 21h10" />
      </>
    ),
    comfort: (
      <>
        <path d="M12 3 5 11h5l-2 10 11-13h-6l1-5" />
      </>
    ),
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    'arrow-right': <path d="M4 12h16m-6-6 6 6-6 6" />,
    'arrow-up-right': <path d="M6 18 18 6M8 6h10v10" />,
    'arrow-up': <path d="M12 20V4m-6 6 6-6 6 6" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />,
    check: <path d="m4 12 5 5L20 6" />,
    star: <path d="m12 2 3.1 6.3 7 .9-5 4.9 1.2 6.9L12 17.7l-6.3 3.3 1.2-6.9-5-4.9 7-.9L12 2Z" />,
    plus: <path d="M12 5v14m-7-7h14" />,
    minus: <path d="M5 12h14" />,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2Z" /></>,
    bed: <><path d="M3 18V8m18 10V8M3 15h18M5 11V6h14v5M3 18h18M3 18v3m18-3v3" /><path d="M3 15v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" /></>,
    'arrow-left': <path d="M20 12H4m6-6-6 6 6 6" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-2.5 3.5M6.1 6.1C3.4 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.1-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    'log-out': <path d="M10 4H4v16h6m4-12 4 4-4 4m-5-4h13" />,
    sparkle: <path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

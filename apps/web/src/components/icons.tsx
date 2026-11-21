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
  | 'sparkle';

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

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SiteShell from '@/components/site-shell';
import { LanguageProvider } from '@/components/language-provider';
import { ToastProvider } from '@/components/toast-provider';
import { WishlistProvider } from '@/lib/live-data';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Dylan Grand Hotel | The art of feeling at home', template: '%s | Dylan Grand Hotel' },
  description: 'Dylan Grand Hotel — a boutique escape in southern England. Discover rooms, experiences and thoughtful hospitality.'
};
export default function RootLayout({ children }: { children: ReactNode; }) {
  return <html lang="en" suppressHydrationWarning>
    <body>
      <LanguageProvider>
        <ToastProvider>
          <WishlistProvider>
            <SiteShell>{children}</SiteShell>
          </WishlistProvider>
        </ToastProvider>
      </LanguageProvider>
    </body>
  </html>;
}

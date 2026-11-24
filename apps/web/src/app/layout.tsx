import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SiteShell from '@/components/site-shell';
import { LanguageProvider } from '@/components/language-provider';
import { ToastProvider } from '@/components/toast-provider';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Dylan Grand Hotel | The art of feeling at home', template: '%s | Dylan Grand Hotel' },
  description: 'A boutique hotel booking experience in Saigon. A frontend-only portfolio concept.'
};
export default function RootLayout({ children }: { children: ReactNode; }) {
  return <html lang="en" suppressHydrationWarning>
    <body>
      <LanguageProvider>
        <ToastProvider>
          <SiteShell>{children}</SiteShell>
        </ToastProvider>
      </LanguageProvider>
    </body>
  </html>;
}

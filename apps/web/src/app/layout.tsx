import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const metadataBase = (() => {
  try {
    return new URL(appUrl);
  } catch {
    return new URL('http://localhost:3000');
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'Stellarship',
    template: '%s | Stellarship',
  },
  description: 'A zero-knowledge on-chain naval strategy prototype on Stellar Testnet.',
  applicationName: 'Stellarship',
  keywords: ['Stellar', 'Soroban', 'zero-knowledge', 'zk', 'battleship', 'on-chain game'],
  openGraph: {
    type: 'website',
    title: 'Stellarship',
    description: 'Hidden-information naval strategy with commitments and ZK settlement on Stellar.',
    siteName: 'Stellarship',
  },
  twitter: {
    card: 'summary',
    title: 'Stellarship',
    description: 'Hidden-information naval strategy with commitments and ZK settlement on Stellar.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Some browser extensions inject attributes into <html>/<body> before React hydrates,
    // which triggers noisy hydration mismatch warnings. This silences those warnings.
    <html lang="en" className="font-departure" suppressHydrationWarning>
      <body className="text-medieval-text">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

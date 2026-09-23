import type { Metadata, Viewport } from 'next';
import { Cinzel, JetBrains_Mono, Plus_Jakarta_Sans, Syne } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-cinzel',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
});

const title = 'BORDERLAND PROTOCOL — Reverse Hackathon';
const description =
  'Enter the Borderland. A 2-Day Reverse Hackathon where Player Groups uncover the secret purpose, architecture, and flaws of unknown products.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#08080a',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${cinzel.variable} ${jetbrainsMono.variable} ${plusJakartaSans.variable} ${syne.variable}`}
    >
      <body className="bg-[#08080a] text-[#ededed] antialiased selection:bg-red-600/30 selection:text-red-200">
        {children}
      </body>
    </html>
  );
}

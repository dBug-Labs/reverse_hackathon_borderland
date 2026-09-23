import type { Metadata, Viewport } from 'next';
import { Anton, Cinzel, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Poster display face (the HACKBACK wordmark)
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
});

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


const title = 'HACKBACK — Reverse Hackathon';
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
      className={`dark ${anton.variable} ${cinzel.variable} ${jetbrainsMono.variable} ${plusJakartaSans.variable}`}
    >
      <body className="bg-[#08080a] text-[#ededed] antialiased selection:bg-red-600/30 selection:text-red-200">
        {children}
      </body>
    </html>
  );
}

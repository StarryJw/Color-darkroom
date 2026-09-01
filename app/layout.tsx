import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: '色彩暗房｜摄影色彩交互学习',
  description: '通过真实照片与即时调节，学习摄影后期中的色彩原理。',
  openGraph: {
    title: '色彩暗房',
    description: '把色彩理论，变成看得见的调色练习',
    type: 'website',
    images: [{ url: '/og.webp', width: 1200, height: 630, alt: '色彩暗房摄影色彩学习网站' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '色彩暗房',
    description: '把色彩理论，变成看得见的调色练习',
    images: ['/og.webp'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

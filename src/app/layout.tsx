import type { Metadata, Viewport } from "next";
import { WebVitals } from "@/components/WebVitals";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Real-Slide | 실시간 프레젠테이션",
    template: "%s | Real-Slide",
  },
  description:
    "Mentimeter & AhaSlides 같은 실시간 상호작용 프레젠테이션 플랫폼. 투표, 퀴즈, 워드클라우드로 참여자와 소통하세요.",
  keywords: ["presentation", "real-time", "interactive", "slides", "quiz", "poll", "wordcloud"],
  authors: [{ name: "Real-Slide Team" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
    title: "Real-Slide | 실시간 프레젠테이션",
    description: "실시간 상호작용 프레젠테이션 플랫폼",
    siteName: "Real-Slide",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real-Slide | 실시간 프레젠테이션",
    description: "실시간 상호작용 프레젠테이션 플랫폼",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Preconnect to Supabase for faster API calls */}
        <link rel="preconnect" href="https://nvvyzfenvqyrhsjuevzm.supabase.co" />
        <link rel="dns-prefetch" href="https://nvvyzfenvqyrhsjuevzm.supabase.co" />
        {/* Preconnect to Google Fonts if used */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-50">
        <WebVitals />
        {children}
      </body>
    </html>
  );
}

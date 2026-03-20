import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real-Slide | 실시간 프레젠테이션",
  description:
    "Mentimeter & AhaSlides 같은 실시간 상호작용 프레젠테이션 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}

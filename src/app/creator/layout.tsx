import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator",
  description: "Create interactive presentations with polls, quizzes, and word clouds.",
  openGraph: {
    title: "Create Presentation | Real-Slide",
    description: "Design engaging presentations with real-time audience interaction.",
  },
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

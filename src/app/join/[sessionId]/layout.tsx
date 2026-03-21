import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Session",
  description: "Join an interactive presentation session and participate in real-time polls, quizzes, and word clouds.",
  robots: {
    index: false, // Don't index participant pages
    follow: true,
  },
};

export default function JoinSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MorphAI - Autonomous AI Manager",
  description: "AI-first SaaS platform for team management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


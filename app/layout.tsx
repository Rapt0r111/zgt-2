import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ЗГТ — Система управления имуществом",
  description: "Система учёта личного состава, техники и носителей",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased font-sans">
        {/*
          NuqsAdapter is REQUIRED for nuqs useQueryStates / useQueryState
          to work in Next.js App Router. Without it, SearchFilters will throw.
        */}
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
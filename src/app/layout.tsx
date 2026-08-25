import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Project Hub",
    template: "%s · Project Hub",
  },
  description: "One clean place to store, browse and access all of our projects.",
};

/** Runs before paint so a saved light theme does not flash dark. */
const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-text antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "autoX — Stop Buying, Start Growing | Wealth Intelligence for India",
  description:
    "autoX reveals the true opportunity cost of every purchase. See what your spending compounds to over 5, 10, and 20 years with AI-powered financial intelligence.",
  keywords: [
    "opportunity cost calculator",
    "personal finance India",
    "wealth building",
    "compound interest",
    "spending vs investing",
    "AI expense tracker",
    "SIP calculator",
  ],
  authors: [{ name: "autoX Team" }],
  openGraph: {
    title: "autoX — Stop Buying, Start Growing",
    description:
      "Every rupee you spend has an opportunity cost. See what your spending could become if invested instead.",
    url: "https://autox.finance",
    siteName: "autoX",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autoX — Stop Buying, Start Growing",
    description:
      "Every rupee you spend has an opportunity cost. Discover the true future value of your money.",
  },
};

import { ThemeProvider } from "./components/landing/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.className, "font-sans", geist.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('autox-theme');
                  const theme = stored || 'system';
                  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] antialiased transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

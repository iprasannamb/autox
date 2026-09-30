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
  title: "autoX — Stop Buying, Start Growing",
  description:
    "autoX shows the real cost of every purchase and what it could become if invested instead. Make smarter financial decisions with AI-powered insights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(inter.className, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Manrope is the only brand typeface; expose it as both --font-manrope and --font-sans
// so shadcn's `font-sans` utility resolves to Manrope too.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// app/icon.png and app/apple-icon.png are picked up by Next's file convention;
// only Safari's pinned-tab mask icon needs declaring by hand.
export const metadata: Metadata = {
  title: "PicScope",
  description: "Enterprise AI-powered visual intelligence and photo discovery.",
  applicationName: "PicScope",
  icons: {
    other: [{ rel: "mask-icon", url: "/mark.svg", color: "#3B82F6" }],
  },
};

// viewportFit=cover + the safe-area padding below keeps content clear of notches
// and home indicators on mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body
        className="flex min-h-full flex-col bg-white"
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

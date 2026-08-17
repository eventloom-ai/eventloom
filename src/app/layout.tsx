import type { Metadata } from "next";
import { Fraunces, Inter, Outfit, Playfair_Display } from "next/font/google";
import { BuildJobProvider } from "@/components/build-job-provider";
import { FeedbackWidget } from "@/components/feedback-widget";
import { GlobalLegalFooter } from "@/components/global-legal-footer";
import { env } from "@/lib/env";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair-face", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter-face", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit-face", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces-face", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl()),
  title: {
    default: "Event Websites and RSVPs, Made Personal | Eventloom",
    template: "%s | Eventloom",
  },
  description: "Create a custom event website, collect guest RSVPs, and keep every reply organized in one beautiful place.",
  applicationName: "Eventloom",
  keywords: ["RSVP website", "online RSVP", "event website", "wedding RSVP", "party invitations"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Event Websites and RSVPs, Made Personal",
    description: "Create an event site, collect guest replies, and share one elegant link with Eventloom.",
    siteName: "Eventloom",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Event Websites and RSVPs, Made Personal",
    description: "Create an event site, collect guest replies, and share one elegant link.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${playfair.variable} ${inter.variable} ${outfit.variable} ${fraunces.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <BuildJobProvider>{children}</BuildJobProvider>
        <GlobalLegalFooter />
        <FeedbackWidget turnstileSiteKey={env.turnstileSiteKey()} />
      </body>
    </html>
  );
}

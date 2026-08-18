import type { Metadata } from "next";
import {
  Big_Shoulders,
  Bodoni_Moda,
  Bricolage_Grotesque,
  Fraunces,
  IBM_Plex_Sans,
  Instrument_Serif,
  Italiana,
  Inter,
  Newsreader,
  Outfit,
  Playfair_Display,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import { BuildJobProvider } from "@/components/build-job-provider";
import { FeedbackWidget } from "@/components/feedback-widget";
import { GlobalLegalFooter } from "@/components/global-legal-footer";
import { env } from "@/lib/env";
import "./globals.css";

// Display faces
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair-face", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces-face", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif-face", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk-face", display: "swap", preload: false });
const bricolageGrotesque = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage-grotesque-face", display: "swap", preload: false });
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-bodoni-moda-face", display: "swap", preload: false });
const italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana-face", display: "swap", preload: false });
const bigShouldersDisplay = Big_Shoulders({ subsets: ["latin"], weight: "700", variable: "--font-big-shoulders-display-face", display: "swap", preload: false });

// Body faces
const inter = Inter({ subsets: ["latin"], variable: "--font-inter-face", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit-face", display: "swap" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans-face", display: "swap", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader-face", display: "swap", preload: false });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ibm-plex-sans-face", display: "swap", preload: false });

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
      className={`h-full antialiased ${playfair.variable} ${inter.variable} ${outfit.variable} ${fraunces.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} ${bricolageGrotesque.variable} ${bodoniModa.variable} ${italiana.variable} ${bigShouldersDisplay.variable} ${workSans.variable} ${newsreader.variable} ${ibmPlexSans.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <BuildJobProvider>{children}</BuildJobProvider>
        <GlobalLegalFooter />
        <FeedbackWidget turnstileSiteKey={env.turnstileSiteKey()} />
      </body>
    </html>
  );
}

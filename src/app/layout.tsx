import type { Metadata } from "next";
import { BuildJobProvider } from "@/components/build-job-provider";
import { FeedbackWidget } from "@/components/feedback-widget";
import { GlobalLegalFooter } from "@/components/global-legal-footer";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl()),
  title: {
    default: "Create a Beautiful RSVP Website in Minutes | Eventloom",
    template: "%s | Eventloom",
  },
  description: "Create a beautiful event website, collect guest RSVPs, and share one simple link. No design or technical experience needed.",
  applicationName: "Eventloom",
  keywords: ["RSVP website", "online RSVP", "event website", "wedding RSVP", "party invitations"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Create a Beautiful RSVP Website in Minutes",
    description: "Describe your event, get a polished website, and collect every guest reply in one place.",
    siteName: "Eventloom",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Create a Beautiful RSVP Website in Minutes",
    description: "A simple way to create an event site and collect guest replies.",
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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <BuildJobProvider>{children}</BuildJobProvider>
        <GlobalLegalFooter />
        <FeedbackWidget turnstileSiteKey={env.turnstileSiteKey()} />
      </body>
    </html>
  );
}

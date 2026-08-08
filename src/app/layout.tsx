import type { Metadata } from "next";
import { BuildJobProvider } from "@/components/build-job-provider";
import { FeedbackWidget } from "@/components/feedback-widget";
import { GlobalLegalFooter } from "@/components/global-legal-footer";
import { env } from "@/lib/env";
import "./globals.css";

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

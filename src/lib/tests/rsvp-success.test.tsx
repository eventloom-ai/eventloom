import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RsvpSuccess } from "@/components/rsvp-success";

describe("RSVP success experience", () => {
  it("confirms the saved reply and offers a truthful creator path", () => {
    const html = renderToStaticMarkup(<RsvpSuccess />);

    expect(html).toContain("Reply received");
    expect(html).toContain("Planning something special?");
    expect(html).toContain("Create my RSVP website");
    expect(html).toContain('href="/#create"');
    expect(html).not.toContain("Download the app");
  });

  it("uses the canonical tracked URL supplied by the public event page", () => {
    const html = renderToStaticMarkup(
      <RsvpSuccess referralHref="https://eventloom.test/referral/signed-token" />,
    );

    expect(html).toContain('href="https://eventloom.test/referral/signed-token"');
  });
});

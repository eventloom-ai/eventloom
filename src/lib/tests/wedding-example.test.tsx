import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WeddingExamplePage from "@/app/examples/wedding/page";

describe("wedding example", () => {
  it("shows the RSVP OS men's English artwork without publishing venue details", () => {
    const html = renderToStaticMarkup(<WeddingExamplePage />);

    expect(html).toContain("%2Fexamples%2Fmen-english.png");
    expect(html).toContain("Men’s English wedding invitation");
    expect(html).not.toContain("Get Directions");
    expect(html).not.toContain("maps.app");
    expect(html).not.toContain("Mississauga Convention Centre");
    expect(html).not.toContain("Street address");
  });
});

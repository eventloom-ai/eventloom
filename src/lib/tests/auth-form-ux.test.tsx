import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth-form";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () =>
    new URLSearchParams(
      "next=%2Fapp%2Fevents%2Fnew%3Fbrief%3DA%2520warm%2520birthday%2520dinner",
    ),
}));

describe("signup conversion flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows required consent before either account-creation method", () => {
    const html = renderToStaticMarkup(
      <AuthForm mode="signup" turnstileSiteKey="test-site-key" />,
    );

    const consent = html.indexOf("Before you continue");
    const google = html.indexOf("Continue with Google");
    const fullName = html.indexOf("Full name");
    const password = html.indexOf("Password");
    const securityCheck = html.indexOf('id="turnstile-');

    expect(consent).toBeGreaterThan(-1);
    expect(consent).toBeLessThan(google);
    expect(google).toBeLessThan(fullName);
    expect(password).toBeLessThan(securityCheck);
    expect(html).toContain("Required once to save your event with Google or email.");
    expect(html).toContain('data-signup-ux="consent-before-provider-v1"');
  });
});

import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const user = {
  id: "10000000-0000-4000-8000-000000000010",
  email: "alex@example.com",
  email_confirmed_at: "2026-07-20T12:00:00.000Z",
  created_at: "2026-07-20T12:00:00.000Z",
  user_metadata: { full_name: "Old Name" },
};

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/security/auth", () => ({
  getAuthContext: () => ({
    user,
    emailVerified: true,
    aal: "aal1",
    nextAal: "aal2",
  }),
  hasRequiredMfa: () => false,
}));
vi.mock("@/lib/supabase/server", () => ({
  getServerUser: () => user,
  createSupabaseServerClient: () => ({
    from: () => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.maybeSingle.mockResolvedValue({
        data: { full_name: "Alex Morgan", created_at: "2026-07-20T12:00:00.000Z" },
        error: null,
      });
      return builder;
    },
  }),
}));

import ProfilePage from "@/app/app/profile/page";

async function renderAsync(element: ReactNode) {
  return new Promise<string>((resolve, reject) => {
    let html = "";
    const destination = new PassThrough();
    destination.on("data", (chunk) => { html += chunk.toString(); });
    destination.on("end", () => resolve(html));
    destination.on("error", reject);
    const stream = renderToPipeableStream(element, {
      onAllReady() {
        stream.pipe(destination);
      },
      onError: reject,
    });
  });
}

describe("creator profile page", () => {
  it("puts identity, security, privacy, export, deletion, and sign-out controls in one discoverable page", async () => {
    const html = await renderAsync(await ProfilePage());

    expect(html).toContain("Your profile");
    expect(html).toContain("Alex Morgan");
    expect(html).toContain("alex@example.com");
    expect(html).toContain('href="/app/security?next=/app/profile"');
    expect(html).toContain("Download account export");
    expect(html).toContain("Submit a privacy request");
    expect(html).toContain("Delete account");
    expect(html).toContain("Sign out of Eventloom");
    expect(html).toContain('href="/app/profile"');
  });
});

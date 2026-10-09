import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteBuildStudio } from "@/components/site-build-studio";
import { intakeAction } from "@/lib/agent/intake";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/app/events/new" }));
vi.mock("next/image", () => ({ default: () => null }));

describe("build studio intake", () => {
  it("only builds on the last question", () => {
    expect(intakeAction({ refining: false, showIntake: false, step: 0, total: 5 })).toBe("open");
    expect(intakeAction({ refining: false, showIntake: true, step: 3, total: 5 })).toBe("advance");
    expect(intakeAction({ refining: false, showIntake: true, step: 4, total: 5 })).toBe("build");
    expect(intakeAction({ refining: true, showIntake: false, step: 0, total: 5 })).toBe("build");
  });

  it("renders no submit button while a question is still ahead, so no click can start a paid build", () => {
    const html = renderToStaticMarkup(<SiteBuildStudio initialPrompt="A cozy autumn birthday dinner" />);
    expect(html).toContain("Question 1 of 5");
    expect(html).toContain("Next question");
    expect(html).not.toContain('type="submit"');
  });

});

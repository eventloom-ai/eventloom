import type { ImageInput } from "@/lib/ai/generator";
import type { ThemeOverrides } from "@/lib/event-theme";
import { extractPaletteFromPrompt } from "@/lib/event-theme";
import { slugSchema } from "@/lib/validation";

export type ParsedBuildForm = {
  prompt: string;
  slug: string | null;
  templateHint?: "wedding" | "custom";
  images: ImageInput[];
  themeOverrides?: ThemeOverrides;
  existingEventId?: string;
};

export async function parseBuildForm(form: FormData | null, body: Record<string, FormDataEntryValue>): Promise<ParsedBuildForm> {
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const slug = slugSchema.safeParse(body.slug);
  const templateHint = body.template === "wedding" ? ("wedding" as const) : undefined;
  const images = form ? await readImages(form) : [];
  const themeOverrides = readThemeOverrides(body);
  const existingEventId = typeof body.event_id === "string" && /^[0-9a-f-]{36}$/i.test(body.event_id) ? body.event_id : undefined;

  return {
    prompt,
    slug: slug.success ? slug.data : null,
    templateHint,
    images,
    themeOverrides,
    existingEventId,
  };
}

function readThemeOverrides(body: Record<string, FormDataEntryValue>): ThemeOverrides | undefined {
  const mood = typeof body.mood === "string" && body.mood.trim() ? body.mood.trim().toLowerCase() : undefined;

  if (typeof body.theme_colors === "string" && body.theme_colors.trim()) {
    try {
      const parsed = JSON.parse(body.theme_colors) as unknown;
      if (Array.isArray(parsed)) {
        const colors = parsed.filter((value): value is string => typeof value === "string");
        if (colors.length) {
          return { mood, colors };
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  if (mood) {
    return { mood };
  }

  return undefined;
}

async function readImages(form: FormData): Promise<ImageInput[]> {
  return Promise.all(
    form
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.type.startsWith("image/"))
      .slice(0, 8)
      .map(async (file) => ({
        name: file.name,
        mediaType: file.type,
        dataUrl: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
      })),
  );
}

export function enrichPromptWithTheme(prompt: string, themeOverrides?: ThemeOverrides) {
  if (themeOverrides?.mood) {
    return `${prompt.trim()} Use a ${themeOverrides.mood} color palette.`;
  }

  if (themeOverrides?.colors?.length) {
    return `${prompt.trim()} Use these brand colors: ${themeOverrides.colors.join(", ")}.`;
  }

  const palette = extractPaletteFromPrompt(prompt);
  return palette ? prompt : prompt;
}

export function applyImagesToConfig<T extends { heroImageUrl?: string; galleryImageUrls?: string[] }>(
  config: T,
  images: ImageInput[],
): T {
  if (!images.length) return config;

  return {
    ...config,
    heroImageUrl: images[0].dataUrl,
    galleryImageUrls: images.slice(1).map((image) => image.dataUrl),
  };
}

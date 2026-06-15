import { env } from "@/lib/env";

type InvitationImageInput = {
  names?: string;
  style?: string;
};

export async function generateInvitationImage(input: InvitationImageInput = {}) {
  const names = input.names?.trim() || "Alex & Sarah";
  const style = input.style?.trim() || "soft luxury blush wedding";

  const openaiKey = env.openaiApiKey();
  if (openaiKey) {
    const generated = await generateWithOpenAI(openaiKey, names, style);
    if (generated) {
      return { ok: true as const, imageUrl: generated, source: "openai" as const };
    }
  }

  return { ok: true as const, imageUrl: fallbackInvitationSvg(names, style), source: "fallback" as const };
}

async function generateWithOpenAI(apiKey: string, names: string, style: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: [
        "Elegant printed wedding invitation artwork.",
        `Couple names: ${names}.`,
        `Style: ${style}.`,
        "Soft blush, cream, and rose tones with botanical accents.",
        "Portrait orientation, decorative border, no readable text or typography in the image.",
      ].join(" "),
      size: "1024x1792",
      response_format: "b64_json",
      quality: "standard",
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string }>;
  } | null;

  const b64 = data?.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : null;
}

function fallbackInvitationSvg(names: string, style: string) {
  const safeNames = escapeXml(names);
  const safeStyle = escapeXml(style);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1434" viewBox="0 0 1024 1434">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fffaf5"/>
          <stop offset="52%" stop-color="#f3e3da"/>
          <stop offset="100%" stop-color="#fbf7f1"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="18%" r="42%">
          <stop offset="0%" stop-color="#d9a3a0" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#d9a3a0" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1434" fill="url(#bg)"/>
      <rect width="1024" height="1434" fill="url(#glow)"/>
      <rect x="72" y="72" width="880" height="1290" rx="48" fill="none" stroke="#6f3032" stroke-opacity="0.18" stroke-width="3"/>
      <rect x="108" y="108" width="808" height="1218" rx="36" fill="none" stroke="#6f3032" stroke-opacity="0.1" stroke-width="2"/>
      <path d="M512 220 C430 300, 300 280, 300 390 C300 500, 430 520, 512 430 C594 520, 724 500, 724 390 C724 280, 594 300, 512 220Z" fill="#d9a3a0" fill-opacity="0.22"/>
      <text x="512" y="560" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#747d5c" letter-spacing="8">TOGETHER WITH THEIR FAMILIES</text>
      <text x="512" y="700" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="118" fill="#6f3032">${safeNames}</text>
      <line x1="392" y1="760" x2="632" y2="760" stroke="#6f3032" stroke-opacity="0.25" stroke-width="2"/>
      <text x="512" y="860" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#1f1a17">Request the honor of your presence</text>
      <text x="512" y="910" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#1f1a17">at their wedding celebration.</text>
      <text x="512" y="1040" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="#6f3032" fill-opacity="0.75" letter-spacing="4">${safeStyle.toUpperCase()}</text>
      <text x="512" y="1180" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#6f3032" fill-opacity="0.65" letter-spacing="5">SUMMER 2026</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function sampleInvitationImageUrl(names = "Alex & Sarah") {
  return fallbackInvitationSvg(names, "soft luxury blush wedding");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

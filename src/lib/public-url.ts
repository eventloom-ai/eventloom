export function publicSiteHost() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    try {
      return new URL(appUrl).host;
    } catch {
      // fall through
    }
  }

  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "eventloom.ai";
}

export function publicSlugPath(slug: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    return `${appUrl}/${slug}`;
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "eventloom.ai";
  return `https://${root}/${slug}`;
}

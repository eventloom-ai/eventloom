export const EVENT_ASSET_BUCKET = "event-assets-private";

// Asset metadata is stored alongside user-influenced rows, so service-role storage calls only trust our own bucket and the owning event's folder.
export function isEventAssetPath(metadata: unknown, eventId: unknown): metadata is { bucket: string; path: string } {
  if (!metadata || typeof metadata !== "object" || typeof eventId !== "string" || !eventId) return false;
  const { bucket, path } = metadata as { bucket?: unknown; path?: unknown };
  return bucket === EVENT_ASSET_BUCKET && typeof path === "string" && path.startsWith(`${eventId}/`) && !path.includes("..") && /^[\w-]+\/[\w.-]+$/.test(path);
}

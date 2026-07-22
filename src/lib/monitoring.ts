import "server-only";

type MonitorLevel = "info" | "warn" | "error";
type SafeValue = boolean | number | string | null | undefined;

const forbiddenKey = /(answer|address|contact|cookie|email|file|guest|name|payload|phone|prompt|secret|token)/i;

export function reportOperationalEvent(
  level: MonitorLevel,
  event: string,
  context: Record<string, SafeValue> = {},
) {
  const safeContext = Object.fromEntries(
    Object.entries(context).filter(([key]) => !forbiddenKey.test(key)),
  );
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "eventloom",
    event,
    ...safeContext,
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

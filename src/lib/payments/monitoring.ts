type PaymentLogLevel = "info" | "warn" | "error";

type PaymentLogContext = Record<string, boolean | number | string | null | undefined>;

export function logPaymentEvent(level: PaymentLogLevel, event: string, context: PaymentLogContext = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "payments",
    event,
    ...context,
  });

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

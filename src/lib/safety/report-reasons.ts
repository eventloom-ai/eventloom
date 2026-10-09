/** Reasons a guest can give on the "Report this page" form. Keep in step with abuse_reports.reason's check. */
export const REPORT_REASONS = [
  { value: "phishing", label: "Phishing or scam" },
  { value: "hate", label: "Hate or harassment" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence", label: "Violence" },
  { value: "impersonation", label: "Impersonation" },
  { value: "copyright", label: "Copyright or trademark" },
  { value: "privacy", label: "Privacy or doxxing" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((reason) => reason.value) as [ReportReason, ...ReportReason[]];

export function reportReasonLabel(value: string) {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

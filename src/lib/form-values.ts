import { retryAfterPhrase } from "@/lib/rate-limit-message";

export function optionalFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

// Without a party-size control the guest list is the party, so send a size the server's name check accepts.
export function rsvpPartySize(input: { attending: boolean; hasPartySizeField: boolean; partySize: number; guestNames: string[] }) {
  if (!input.attending) return 0;
  return input.hasPartySizeField ? input.partySize : Math.max(1, input.guestNames.length);
}

export function rsvpErrorMessage(code: unknown, retryAfterSeconds?: number | null) {
  switch (code) {
    case "rate_limited":
      return `Too many replies were sent from this connection. Please try again ${retryAfterPhrase(retryAfterSeconds)}.`;
    case "guest_count_mismatch":
      return "Add one guest name per attendee, so the names match your party size.";
    case "duplicate_guest":
      return "Each guest name can appear only once.";
    case "invalid_party_size":
      return "Party size must be at least 1 when you are attending.";
    case "verification_failed":
      return "We could not verify your browser. Complete the check and try again.";
    case "unavailable":
      return "This event is not accepting replies right now.";
    case "try_later":
      return "Too many replies were sent from this connection. Please wait a few minutes and try again.";
    case "network_error":
      return "We could not reach the server. Check your connection and try again.";
    default:
      return "We could not save your reply. Please check the form and try again.";
  }
}

export function creatorErrorMessage(code: string | null | undefined, fallback = "That didn’t finish. Please try again.") {
  switch (code) {
    case "slug_taken":
      return "That site address is already in use. Choose another one and try again.";
    case "unauthorized":
      return "Your sign-in expired. Sign in again, then continue where you left off.";
    case "forbidden":
      return "That action was blocked for your protection. Refresh the page and try again.";
    case "payload_too_large":
      return "That request is too large. Shorten the description or use a smaller image.";
    case "invalid":
    case "invalid_edit":
      return "Check the information you entered, then try again.";
    case "ai_credit_limit_reached":
      return "Your included AI build credit is used. Your draft is safe, and direct editing still works.";
    case "version_conflict":
      return "This site changed in another tab. We loaded the newest version so you can continue safely.";
    case "run_in_progress":
      return "One change is still finishing. Wait for it to complete, then send the next request.";
    case "not_found":
      return "This event is no longer available here. Return to My events and open it again.";
    case "invalid_image":
      return "Use a PNG, JPEG, WebP, or GIF image smaller than 10 MB.";
    case "upload_failed":
      return "We couldn’t save that image. Try a smaller image or a different file.";
    case "network_error":
      return "We couldn’t reach Eventloom. Check your connection and try again.";
    case "create_event_failed":
    case "studio_create_failed":
      return "We couldn’t create the workspace. Nothing was charged—please try again.";
    case "storage_not_configured":
    case "version_insert_failed":
    case "invalid_revision":
      return "We couldn’t save that change, but your previous version is safe. Please try again.";
    default:
      return fallback;
  }
}

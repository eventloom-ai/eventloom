export const FEEDBACK_OPEN_EVENT = "eventloom:open-feedback";

export function isFeedbackSubmitDisabled(busy: boolean, message: string) {
  return busy || message.trim().length < 10;
}

let feedbackDialogRequestPending = false;

export function requestFeedbackDialog(target: Pick<Window, "dispatchEvent"> = window) {
  feedbackDialogRequestPending = true;
  target.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT));
}

export function takePendingFeedbackDialogRequest() {
  if (!feedbackDialogRequestPending) return false;
  feedbackDialogRequestPending = false;
  return true;
}
